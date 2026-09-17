const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const fs = require('node:fs');
const { loadTypeScript, plain } = require('./helpers/load-typescript.cjs');
const { authenticatedIdentity, privateOwnerKey } = loadTypeScript('server/owner-identity.ts');
const { authenticationConfigured } = loadTypeScript('server/auth-configuration.ts');
const { ownerHandler } = loadTypeScript('server/owner-http.ts');
const { createOwnerService } = loadTypeScript('server/owner-backend.ts');
const { ProfileService } = loadTypeScript('application/profile-service.ts');
const { MemoryStore } = loadTypeScript('persistence/memory-store.ts');
const { TemporaryOwnerStore } = loadTypeScript('persistence/temporary-owner-store.ts');
const { DemoStore } = loadTypeScript('persistence/demo-store.ts');
const { demoSession } = loadTypeScript('server/demo-session.ts');
const at = '2026-09-15T12:00:00.000Z';
const ownerService = store => new ProfileService(store, () => at, 'empty');
const create = (id, extra = {}) => ({ type: 'create', id, input: { title: 'My commitment', category: 'work', visibility: [] }, ...extra });
function request(body, query = '', headers = {}) {
 return new Request(`https://profile.example/api/me/profile-state${query}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://profile.example', ...headers }, body: JSON.stringify(body) } : { headers });
}
function handler(app, subject) { return ownerHandler(async () => subject ? authenticatedIdentity(subject) : null, async () => app, () => 'local'); }

test('auth configuration is optional for the demo and requires both keys for private authentication', () => {
 assert.equal(authenticationConfigured({}), false);
 assert.equal(authenticationConfigured({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'present' }), false);
 assert.equal(authenticationConfigured({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'present', CLERK_SECRET_KEY: 'present' }), true);
});
test('stable authenticated subject determines a namespaced owner key, never email', () => {
 assert.deepEqual(plain(authenticatedIdentity('user_A')), { subject: 'user_A' });
 assert.equal(privateOwnerKey({ subject: 'user_A' }), privateOwnerKey({ subject: 'user_A' }));
 assert.notEqual(privateOwnerKey({ subject: 'user_A' }), privateOwnerKey({ subject: 'user_B' }));
 assert.match(privateOwnerKey({ subject: '../../demo-user' }), /^owner-[a-f0-9]{64}$/);
 assert.throws(() => authenticatedIdentity(null), /Sign in/);
 assert.throws(() => privateOwnerKey({ subject: '' }), /Sign in/);
});
test('anonymous public demo initializes without any authenticated identity', async () => {
 const identity = demoSession(new Request('https://profile.example/api/profile-state'));
 const view = await new ProfileService(new DemoStore(), () => at).read(identity.userId);
 assert.equal(view.profile.about.name, 'Alex Morgan');
 assert.equal(view.state.evidence.length, 136);
 assert.equal(view.reliability.result.followThroughRate, 94.34);
 assert.notEqual(identity.userId, privateOwnerKey({ subject: identity.userId }));
});
test('private GET and POST return 401 before any repository operation when unauthenticated', async () => {
 let touched = false;
 const run = ownerHandler(async () => null, async () => { touched = true; throw new Error('must not run'); }, () => 'local');
 for (const req of [request(), request(create('x')), request(null, '?userId=user_A', { 'x-user-id': 'user_A', cookie: 'human-profile-demo=dev-user-001' })]) {
  const response = await run(req);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
 }
 assert.equal(touched, false);
});
test('new authenticated profiles start empty with all sharing disabled', async () => {
 const run = handler(ownerService(new MemoryStore()), 'user_A');
 const response = await run(request());
 assert.equal(response.status, 200);
 const view = await response.json();
 assert.equal(view.mode, 'owner-local');
 assert.equal(view.profile.ownerId, privateOwnerKey({ subject: 'user_A' }));
 assert.equal(view.profile.about.name, '');
 assert.deepEqual(view.state.commitments, []);
 assert.deepEqual(view.state.evidence, []);
 assert.ok(Object.values(view.profile.permissions).every(section => Object.values(section).every(value => value === false)));
 assert.equal(view.reliability.result.eligibleCommitments, 0);
});
test('query/body/header owner IDs cannot override the server session subject', async () => {
 const app = ownerService(new MemoryStore()), runA = handler(app, 'user_A'), runB = handler(app, 'user_B');
 const spoof = { ownerId: 'user_B', userId: 'user_B', profileId: 'user_B', subject: 'user_B' };
 const response = await runA(request(create('a-only', spoof), '?userId=user_B&ownerId=user_B', { 'x-user-id': 'user_B' }));
 assert.equal(response.status, 200);
 assert.equal((await response.json()).state.commitments[0].ownerId, privateOwnerKey({ subject: 'user_A' }));
 assert.equal((await (await runB(request())).json()).state.commitments.length, 0);
 const view = await (await runA(request(null, '?ownerId=user_B'))).json();
 assert.equal(view.state.commitments[0].id, 'a-only');
 const save = await runA(request({ type: 'profile', ...spoof, profile: { ...view.profile, ...spoof, about: { ...view.profile.about, name: 'Owner A' } } }));
 assert.equal(save.status, 200);
 assert.equal((await (await runB(request())).json()).profile.about.name, '');
 assert.equal((await save.json()).profile.ownerId, privateOwnerKey({ subject: 'user_A' }));
});
test('A cannot retrieve or mutate B records, including evidence, by changing input IDs', async () => {
 const app = ownerService(new MemoryStore()), runA = handler(app, 'user_A'), runB = handler(app, 'user_B');
 await runB(request(create('b-secret')));
 const failed = await runA(request({ type: 'complete', id: 'b-secret', ownerId: 'user_B' }));
 assert.notEqual(failed.status, 200);
 await runB(request({ type: 'complete', id: 'b-secret' }));
 const before = await (await runB(request())).json();
 const evidence = before.state.evidence[0];
 const dispute = await runA(request({ type: 'evidence', id: evidence.id, ownerId: 'user_B', command: { action: 'disputed' }, context: { note: 'Attempted cross-owner mutation' } }));
 assert.notEqual(dispute.status, 200);
 const after = await (await runB(request())).json();
 assert.deepEqual(after.state, before.state);
 assert.deepEqual((await (await runA(request(null, '?userId=user_B'))).json()).state.evidence, []);
});
test('identical record IDs remain independent across authenticated owners', async () => {
 const app = ownerService(new MemoryStore()), runA = handler(app, 'user_A'), runB = handler(app, 'user_B');
 await runA(request(create('same'))); await runB(request(create('same')));
 await runA(request({ type: 'complete', id: 'same' }));
 const a = await (await runA(request())).json(), b = await (await runB(request())).json();
 assert.equal(a.state.commitments[0].status, 'completed');
 assert.equal(b.state.commitments[0].status, 'active');
 assert.equal(a.state.evidence.length, 1); assert.equal(b.state.evidence.length, 0);
});
test('private outcomes retain existing evidence/reliability rules and disputes exclude outcomes', async () => {
 const run = handler(ownerService(new MemoryStore()), 'user_A');
 await run(request(create('own'))); await run(request({ type: 'complete', id: 'own' }));
 let view = await (await run(request())).json();
 assert.equal(view.reliability.result.followThroughRate, 100);
 assert.equal(view.state.evidence[0].sourceType, 'observed');
 assert.equal(view.state.evidence[0].verificationStatus, 'unverified');
 const response = await run(request({ type: 'evidence', id: 'outcome:own', command: { action: 'disputed' }, context: { note: 'Needs correction' } }));
 assert.equal(response.status, 200);
 view = await response.json();
 assert.equal(view.reliability.result.eligibleCommitments, 0);
 assert.equal(view.state.evidence[0].auditHistory.at(-1).actor.source, 'Profile owner');
 assert.equal(view.state.evidence[0].auditHistory.at(-1).actor.demo, false);
});
test('private mutations reject missing/foreign origins and cross-site fetches', async () => {
 const run = handler(ownerService(new MemoryStore()), 'user_A');
 for (const origin of ['https://attacker.example', 'null', '']) {
  const req = request(create('blocked'), '', { origin });
  if (!origin) req.headers.delete('origin');
  assert.equal((await run(req)).status, 400);
 }
 assert.equal((await run(request(null, '', { 'sec-fetch-site': 'cross-site' }))).status, 400);
 assert.equal((await (await run(request())).json()).state.commitments.length, 0);
});
test('private local persistence survives recreation and never reads the demo partition', async t => {
 const directory = await mkdtemp(join(tmpdir(), 'human-profile-owners-'));
 t.after(() => rm(directory, { recursive: true, force: true }));
 const env = { HUMAN_PROFILE_DATA_DIR: directory };
 const app = await createOwnerService(env), run = handler(app, 'dev-user-001');
 await run(request(create('owner-only')));
 const view = await (await handler(await createOwnerService(env), 'dev-user-001')(request())).json();
 assert.equal(view.state.commitments.length, 1);
 assert.equal(view.profile.about.name, '');
 const files = fs.readdirSync(join(directory, 'owners'));
 assert.equal(files.length, 1); assert.match(files[0], /^owner-.*\.json$/);
 assert.equal(fs.existsSync(join(directory, 'dev-user-001.json')), false);
});
test('hosted private persistence requires configuration; legacy temporary adapter remains bounded', async () => {
 await assert.rejects(createOwnerService({ VERCEL: '1', HUMAN_PROFILE_DATA_DIR: '/dev/null/never-write' }), /HUMAN_PROFILE_DYNAMODB_TABLE/);
 let clock = 0;
 const store = new TemporaryOwnerStore(() => clock, 100, 1);
 const service = ownerService(store);
 await service.execute('a', { ...create('x'), at });
 await assert.rejects(service.read('b'), /storage is full/);
 clock = 101;
 assert.equal((await service.read('a')).state.commitments.length, 0);
 await assert.rejects(store.transaction('a', async r => {
  for (let i = 0; i < 251; i++) await r.commitments.save({ id: String(i), ownerId: 'a' });
 }), /record limit/);
 assert.equal((await service.read('a')).state.commitments.length, 0);
});
test('application and domain have no direct Clerk or Next.js dependencies', () => {
 for (const directory of ['application', 'domain']) for (const file of fs.readdirSync(directory, { recursive: true })) {
  if (!file.endsWith('.ts')) continue;
  const source = fs.readFileSync(join(directory, file), 'utf8');
  assert.doesNotMatch(source, /(?:from\s*|import\s*\(|require\s*\()\s*['"](?:@clerk\/|next(?:\/|['"]))/);
 }
});

test('local server origins match Next middleware normalization for Clerk same-page rewrites', () => {
 const { NextRequest } = require('next/server');
 const { scripts } = require('../package.json');
 for (const name of ['dev', 'start']) {
  const host = scripts[name].match(/--hostname\s+(\S+)/)?.[1];
  assert.ok(host, `${name} must explicitly bind to loopback`);
  assert.equal(host, 'localhost');
  const url = `http://${host}:3000/sign-in`;
  assert.equal(new NextRequest(url).url, url, 'Clerk self-rewrite must stay on the Next server origin');
 }
});
