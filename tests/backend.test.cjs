const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadTypeScript, plain } = require('./helpers/load-typescript.cjs');
const { FileStore, PersistenceError } = loadTypeScript('persistence/file-store.ts');
const { MemoryStore } = loadTypeScript('persistence/memory-store.ts');
const { ProfileService } = loadTypeScript('application/profile-service.ts');
const { parseCommand } = loadTypeScript('server/commands.ts');
const { commitmentSeed } = loadTypeScript('data/mocks/commitments.ts');
const { profileEvidence } = loadTypeScript('data/profile-details.ts');
const at = '2026-09-12T12:00:00.000Z';
const owner = 'test-user-001';
const service = store => new ProfileService(store, () => at);
const create = id => ({ type: 'create', id, at, input: { title: `Test ${id}`, category: 'work', visibility: ['employer'] } });
const evidenceAction = (id, action, changes) => ({ type: 'evidence', id, at, command: action === 'corrected' ? { action, changes } : { action }, context: { id: `${action}:${id}`, at, actor: { type: 'user', source: 'Test owner' }, note: 'Test workflow reason' } });
async function fixture(t) {
 const directory = await mkdtemp(join(tmpdir(), 'human-profile-backend-'));
 t.after(() => rm(directory, { recursive: true, force: true }));
 return { directory, store: new FileStore(directory), reload: () => service(new FileStore(directory)) };
}
for (const adapter of ['memory', 'file']) test(`${adapter} repositories save, read, list and update owned commitments and evidence`, async t => {
 const store = adapter === 'memory' ? new MemoryStore() : (await fixture(t)).store;
 const commitment = { ...plain(commitmentSeed.commitments[0]), ownerId: owner };
 const evidence = { ...plain(profileEvidence[0]), ownerId: owner };
 await store.transaction(owner, async r => { await r.commitments.save(commitment); await r.evidence.save(evidence); });
 await store.transaction(owner, async r => {
  assert.deepEqual(plain(await r.commitments.getById(owner, commitment.id)), commitment);
  assert.deepEqual(plain(await r.evidence.getById(owner, evidence.id)), evidence);
  const detached = await r.evidence.getById(owner, evidence.id); detached.title = 'Not saved';
  assert.equal((await r.evidence.getById(owner, evidence.id)).title, evidence.title);
  await r.commitments.save({ ...commitment, title: 'Updated' });
  await r.evidence.save({ ...evidence, description: 'Updated description' });
 });
 await store.transaction(owner, async r => {
  assert.equal((await r.commitments.listForUser(owner)).length, 1);
  assert.equal((await r.commitments.getById(owner, commitment.id)).title, 'Updated');
  assert.equal((await r.evidence.listForUser(owner))[0].description, 'Updated description');
 });
});
for (const adapter of ['memory', 'file']) test(`${adapter} user scopes reject cross-owner reads/writes and isolate matching IDs`, async t => {
 const store = adapter === 'memory' ? new MemoryStore() : (await fixture(t)).store;
 const commitment = { ...plain(commitmentSeed.commitments[0]), ownerId: owner };
 await store.transaction(owner, async r => { await r.commitments.save(commitment); });
 await store.transaction('other-user', async r => {
  assert.equal(await r.commitments.getById('other-user', commitment.id), undefined);
  assert.equal((await r.evidence.listForUser('other-user')).length, 0);
  await assert.rejects(r.commitments.getById(owner, commitment.id), /scope/);
  await assert.rejects(r.evidence.listForUser(owner), /scope/);
  await assert.rejects(r.profile.get(owner), /scope/);
  await assert.rejects(r.commitments.save(commitment), /scope/);
  await assert.rejects(r.evidence.save({ ...profileEvidence[0], ownerId: owner }), /scope/);
 });
});
test('first read seeds once, preserves 94%, and does not overwrite changes on reload', async t => {
 const { store, directory, reload } = await fixture(t);
 const first = await service(store).read(owner);
 assert.equal(first.reliability.result.followThroughRate, 94.34);
 assert.equal(first.state.evidence.length, 136);
 await service(store).execute(owner, create('persisted'));
 const next = await reload().read(owner);
 assert.equal(next.state.commitments.length, first.state.commitments.length + 1);
 assert.ok(next.state.commitments.some(c => c.id === 'persisted'));
 assert.equal(next.state.evidence.length, 136);
 const disk = JSON.parse(await readFile(join(directory, `${owner}.json`), 'utf8'));
 assert.equal(disk.version, 1);
 assert.ok(disk.commitments.every(c => c.ownerId === owner));
 assert.ok(disk.evidence.every(e => e.ownerId === owner));
 assert.equal(disk.profile.ownerId, owner);
 assert.equal('reliability' in disk, false);
});
test('partial user data gets profile defaults without reseeding or replacing records', async t => {
 const { store } = await fixture(t);
 await store.transaction(owner, r => r.commitments.save({ ...commitmentSeed.commitments[0], ownerId: owner }));
 const view = await service(store).read(owner);
 assert.equal(view.state.commitments.length, 1);
 assert.equal(view.state.evidence.length, 0);
});
for (const type of ['complete', 'miss', 'cancel']) test(`${type} persists commitment and generated observed evidence together`, async t => {
 const { store, reload } = await fixture(t);
 await service(store).execute(owner, create('new'));
 await service(store).execute(owner, { type, id: 'new', at });
 const view = await reload().read(owner);
 const commitment = view.state.commitments.find(c => c.id === 'new');
 assert.equal(commitment.status, { complete: 'completed', miss: 'missed', cancel: 'cancelled' }[type]);
 const evidence = view.state.evidence.find(e => e.id === commitment.evidenceIds[0]);
 assert.equal(evidence.sourceType, 'observed');
 assert.equal(evidence.auditHistory[0].action, 'created');
 assert.equal(evidence.relatedEntityId, 'new');
 assert.equal(view.reliability.result.eligibleCommitments, type === 'cancel' ? 53 : 54);
});
for (const action of ['disputed', 'revoked']) test(`${action} evidence and pattern exclusion survive repository recreation`, async t => {
 const { store, reload } = await fixture(t);
 const id = 'outcome:commitment-1';
 await service(store).execute(owner, evidenceAction(id, action));
 const view = await reload().read(owner);
 const e = view.state.evidence.find(e => e.id === id);
 assert.equal(e.verificationStatus, action);
 assert.equal(e.auditHistory.at(-1).action, action);
 assert.equal(view.reliability.result.eligibleCommitments, 52);
 assert.ok(!view.reliability.evidence.some(e => e.id === id));
});
test('correction, dispute resolution and complete audit chain survive reload', async t => {
 const { store, reload } = await fixture(t);
 const id = 'outcome:commitment-1';
 await service(store).execute(owner, evidenceAction(id, 'disputed'));
 await reload().execute(owner, evidenceAction(id, 'corrected', { title: 'Corrected title' }));
 let view = await reload().read(owner);
 assert.equal(view.reliability.result.eligibleCommitments, 52);
 await reload().execute(owner, evidenceAction(id, 'dispute-resolved'));
 view = await reload().read(owner);
 const e = view.state.evidence.find(e => e.id === id);
 assert.equal(e.title, 'Corrected title');
 assert.equal(e.verificationStatus, 'unverified');
 assert.deepEqual(plain(e.auditHistory.map(a => a.action)), ['created', 'disputed', 'corrected', 'dispute-resolved']);
 assert.equal(e.auditHistory[0].next.title, 'Complete dashboard PR');
 assert.equal(view.reliability.result.followThroughRate, 94.34);
});
test('verification source, pending state, visibility and history persist', async t => {
 const { store, reload } = await fixture(t);
 const id = 'outcome:commitment-1';
 await service(store).execute(owner, evidenceAction(id, 'verification-requested'));
 assert.equal((await reload().read(owner)).state.evidence.find(e => e.id === id).verificationStatus, 'pending');
 const command = parseCommand({ type: 'evidence', id, command: { action: 'verified' }, context: { note: 'Mock review' } });
 await reload().execute(owner, command);
 const e = (await reload().read(owner)).state.evidence.find(e => e.id === id);
 assert.equal(e.verificationSource.sourceId, 'demo-reviewer');
 assert.equal(e.provenance, 'human-profile');
 assert.deepEqual(plain(e.visibility), ['employer']);
 assert.equal(e.auditHistory.length, 3);
});
test('About and permission settings persist without losing evidence', async t => {
 const { store, reload } = await fixture(t);
 const view = await service(store).read(owner);
 view.profile.about.description = 'Updated mock description';
 view.profile.permissions.work.employer = false;
 await service(store).execute(owner, { type: 'profile', profile: view.profile });
 const next = await reload().read(owner);
 assert.equal(next.profile.about.description, 'Updated mock description');
 assert.equal(next.profile.permissions.work.employer, false);
 assert.equal(next.state.evidence.length, 136);
});
test('concurrent adapter instances serialize changes without losing records', async t => {
 const { reload } = await fixture(t);
 await Promise.all(Array.from({ length: 8 }, (_, i) => reload().execute(owner, create(`parallel-${i}`))));
 const view = await reload().read(owner);
 assert.equal(view.state.commitments.filter(c => c.id.startsWith('parallel-')).length, 8);
 assert.equal(view.state.evidence.length, 136);
});
test('failed persistence rejects success and preserves the prior commitment/evidence document', async t => {
 const { store, directory, reload } = await fixture(t);
 await service(store).execute(owner, create('failure-test'));
 const before = await readFile(join(directory, `${owner}.json`), 'utf8');
 class FailingStore extends FileStore { async publish() { throw new PersistenceError('Simulated write failure'); } }
 await assert.rejects(service(new FailingStore(directory)).execute(owner, { type: 'complete', id: 'failure-test', at }), /write failure/);
 assert.equal(await readFile(join(directory, `${owner}.json`), 'utf8'), before);
 const next = await reload().read(owner);
 assert.equal(next.state.commitments.find(c => c.id === 'failure-test').status, 'active');
 assert.ok(!next.state.evidence.some(e => e.id === 'outcome:failure-test'));
});
test('failed transaction callback rolls back all repository writes', async t => {
 const { store, reload } = await fixture(t);
 await service(store).read(owner);
 await assert.rejects(store.transaction(owner, async r => {
  await r.evidence.save({ ...profileEvidence[0], title: 'Should not save', ownerId: owner });
  throw new Error('Abort');
 }), /Abort/);
 assert.ok(!(await reload().read(owner)).state.evidence.some(e => e.title === 'Should not save'));
});
test('corrupt documents fail closed instead of being silently reseeded', async t => {
 const { directory, reload } = await fixture(t);
 await writeFile(join(directory, `${owner}.json`), '{corrupt');
 await assert.rejects(reload().read(owner), /not been replaced/);
 assert.equal(await readFile(join(directory, `${owner}.json`), 'utf8'), '{corrupt');
});
test('API command parsing rejects malformed inputs and supplies authoritative demo attribution', () => {
 assert.throws(() => parseCommand({ type: 'create', id: 'x', input: { title: 'x', category: 'work', visibility: 'everyone' } }), /list/);
 assert.throws(() => parseCommand({ type: 'profile', profile: {} }), /object/);
 const command = parseCommand({ type: 'evidence', id: 'e', ownerId: 'victim', command: { action: 'verified', source: { source: 'Fake real source' } }, context: { actor: { source: 'Impersonation' }, at: '1900' } });
 assert.equal(command.command.source.demo, true);
 assert.equal(command.context.actor.source, 'Independent reviewer (mock)');
 assert.notEqual(command.context.at, '1900');
 assert.equal(command.ownerId, undefined);
});
test('localhost boundary accepts browser Host when Next normalizes request.url', () => {
 const { assertLocalRequest } = loadTypeScript('server/request-boundary.ts');
 assert.doesNotThrow(() => assertLocalRequest(new Request('http://localhost:3000/api/profile-state', { headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } })));
 assert.doesNotThrow(() => assertLocalRequest(new Request('http://localhost:3000/api/profile-state', { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } })));
});
test('localhost boundary rejects foreign Host, mismatched ports and cross-origin writes', () => {
 const { assertLocalRequest } = loadTypeScript('server/request-boundary.ts');
 for (const headers of [{ host: 'evil.example', origin: 'http://evil.example' }, { host: 'localhost:3000', origin: 'http://localhost:9999' }, { host: 'localhost:3000', origin: 'http://evil.example' }]) {
  assert.throws(() => assertLocalRequest(new Request('http://localhost:3000/api/profile-state', { headers })), /localhost|Cross-origin/);
 }
});
test('development reset keeps a recoverable backup and reseeds on the next read', async t => {
 const { directory } = await fixture(t);
 const storage = join(directory, 'runtime');
 await service(new FileStore(storage)).execute(owner, create('before-reset'));
 const { execFile } = require('node:child_process');
 const { promisify } = require('node:util');
 await promisify(execFile)(process.execPath, [join(__dirname, '../scripts/reset-local-data.mjs')], { env: { ...process.env, HUMAN_PROFILE_DATA_DIR: storage } });
 const entries = await require('node:fs/promises').readdir(directory);
 const backup = entries.find(name => name.startsWith('runtime.backup-'));
 assert.ok(backup);
 const old = JSON.parse(await readFile(join(directory, backup, `${owner}.json`), 'utf8'));
 assert.ok(old.commitments.some(c => c.id === 'before-reset'));
 const fresh = await service(new FileStore(storage)).read(owner);
 assert.equal(fresh.state.commitments.length, 58);
 assert.equal(fresh.reliability.result.followThroughRate, 94.34);
});
test('repeated completed command after reload does not duplicate evidence or audit', async t => {
 const { store, reload } = await fixture(t);
 await service(store).execute(owner, create('retry'));
 await service(store).execute(owner, { type: 'complete', id: 'retry', at });
 const result = await reload().execute(owner, { type: 'complete', id: 'retry', at });
 const evidence = result.state.evidence.filter(e => e.id === 'outcome:retry');
 assert.equal(evidence.length, 1);
 assert.equal(evidence[0].auditHistory.length, 1);
});
