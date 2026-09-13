const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript, plain } = require('./helpers/load-typescript.cjs');
const { runtimeMode } = loadTypeScript('server/runtime-mode.ts');
const { selectRepository } = loadTypeScript('server/repository-selection.ts');
const { DemoStore } = loadTypeScript('persistence/demo-store.ts');
const { FileStore } = loadTypeScript('persistence/file-store.ts');
const { ProfileService } = loadTypeScript('application/profile-service.ts');
const { demoSession } = loadTypeScript('server/demo-session.ts');
const { assertDemoRequest } = loadTypeScript('server/request-boundary.ts');
const at = '2026-09-12T12:00:00.000Z';
const service = store => new ProfileService(store, () => at);
const create = id => ({ type: 'create', id, at, input: { title: 'Fictional demo commitment', category: 'personal', visibility: [] } });
test('runtime defaults local; explicit demo and Vercel always select public demo', () => {
 assert.equal(runtimeMode({}), 'local');
 assert.equal(runtimeMode({ HUMAN_PROFILE_MODE: 'local' }), 'local');
 assert.equal(runtimeMode({ HUMAN_PROFILE_MODE: 'public-demo' }), 'public-demo');
 assert.equal(runtimeMode({ VERCEL: '1', HUMAN_PROFILE_MODE: 'local' }), 'public-demo');
 assert.throws(() => runtimeMode({ HUMAN_PROFILE_MODE: 'typo' }), /Unsupported/);
});
test('public repository ignores unusable filesystem settings and initializes deterministic state', async () => {
 const repository = await selectRepository({ VERCEL: '1', HUMAN_PROFILE_DATA_DIR: '/dev/null/never-write' });
 assert.ok(repository instanceof DemoStore);
 const view = await service(repository).read('visitor-a');
 assert.equal(view.state.evidence.length, 136);
 assert.equal(view.reliability.result.followThroughRate, 94.34);
});
test('local repository selection preserves FileStore without initializing storage on selection', async () => {
 const repository = await selectRepository({ HUMAN_PROFILE_MODE: 'local', HUMAN_PROFILE_DATA_DIR: '/dev/null/never-write' });
 assert.ok(repository instanceof FileStore);
});
test('public visitors receive isolated deterministic seeds and cannot see each other’s mutations', async () => {
 const app = service(new DemoStore());
 const a = await app.read('visitor-a'), b = await app.read('visitor-b');
 assert.deepEqual(plain(a.state.evidence.map(e => [e.id,e.verificationStatus])), plain(b.state.evidence.map(e => [e.id,e.verificationStatus])));
 await app.execute('visitor-a', create('private-to-a'));
 assert.ok((await app.read('visitor-a')).state.commitments.some(c => c.id === 'private-to-a'));
 assert.ok(!(await app.read('visitor-b')).state.commitments.some(c => c.id === 'private-to-a'));
});
test('warm demo repository preserves actions and evidence; recreation resets to seeds', async () => {
 const app = service(new DemoStore());
 await app.execute('visitor', create('new'));
 await app.execute('visitor', {type:'complete',id:'new',at});
 const view = await app.read('visitor');
 assert.equal(view.state.evidence.find(e => e.id === 'outcome:new').auditHistory[0].action, 'created');
 assert.equal(view.reliability.result.eligibleCommitments,54);
 assert.equal((await service(new DemoStore()).read('visitor')).reliability.result.eligibleCommitments,53);
});
test('demo memory expires inactive sessions and caps visitor count', async () => {
 let time = 0;
 const app = service(new DemoStore(() => time, 100, 2));
 await app.execute('a',create('a-record'));
 time = 101;
 assert.ok(!(await app.read('a')).state.commitments.some(c => c.id === 'a-record'));
 await app.execute('a',create('a-again'));
 await app.read('b'); await app.read('c');
 assert.ok(!(await app.read('a')).state.commitments.some(c => c.id === 'a-again'));
});
test('demo cookie uses random visitor IDs and never accepts a supplied development user', () => {
 const a = demoSession(new Request('https://demo.example/api/profile-state'));
 const b = demoSession(new Request('https://demo.example/api/profile-state'));
 assert.notEqual(a.userId,b.userId);
 assert.match(a.cookie,/HttpOnly; SameSite=Lax; Secure/);
 assert.equal(demoSession(new Request('https://demo.example/api/profile-state',{headers:{cookie:a.cookie.split(';')[0]}})).userId,a.userId);
 assert.notEqual(demoSession(new Request('https://demo.example/api/profile-state',{headers:{cookie:'human-profile-demo=dev-user-001'}})).userId,'dev-user-001');
});
test('public boundary permits matching deployment domains and blocks cross-origin actions', () => {
 assert.doesNotThrow(() => assertDemoRequest(new Request('https://demo.example/api/profile-state',{method:'POST',headers:{host:'demo.example',origin:'https://demo.example'}})));
 assert.throws(() => assertDemoRequest(new Request('https://demo.example/api/profile-state',{method:'POST',headers:{host:'demo.example',origin:'https://foreign.example'}})),/own website/);
 assert.throws(() => assertDemoRequest(new Request('https://demo.example/api/profile-state',{method:'POST'})),/own website/);
});
test('demo limits roll back oversized transactions', async () => {
 const repository = new DemoStore();
 const app = service(repository);
 const initial = await app.read('visitor');
 await assert.rejects(repository.transaction('visitor', async r => {
  for(let i=0;i<251;i++) await r.commitments.save({...initial.state.commitments[0], id:`extra-${i}`,ownerId:'visitor'});
 }),/session is full/);
 assert.equal((await app.read('visitor')).state.commitments.length,58);
});
