const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { join } = require('node:path');
const { loadTypeScript, plain } = require('./helpers/load-typescript.cjs');
const { FakeDynamoClient, key, cancelled } = require('./helpers/fake-dynamodb.cjs');
const { DynamoStore, ownerPartition, entityKey } = loadTypeScript('persistence/dynamodb-store.ts');
const { createDynamoStore } = loadTypeScript('persistence/dynamodb-client.ts');
const { ProfileService } = loadTypeScript('application/profile-service.ts');
const { privateOwnerKey } = loadTypeScript('server/owner-identity.ts');
const { ownerStorageMode, dynamoConfiguration } = loadTypeScript('server/owner-storage-configuration.ts');
const { createOwnerService } = loadTypeScript('server/owner-backend.ts');
const { ownerHandler } = loadTypeScript('server/owner-http.ts');
const { selectRepository } = loadTypeScript('server/repository-selection.ts');
const { demoSession } = loadTypeScript('server/demo-session.ts');
const { DemoStore } = loadTypeScript('persistence/demo-store.ts');
const at = '2026-09-16T12:00:00.000Z';
const A = privateOwnerKey({ subject: 'user_A' }), B = privateOwnerKey({ subject: 'user_B' });
const create = (id, title = 'Private commitment') => ({ type: 'create', id, at, input: { title, category: 'work', visibility: [] } });
const evidence = (action, changes) => ({ type: 'evidence', id: 'outcome:c', at, command: { action, ...(changes ? { changes } : {}) }, context: { id: `${action}-c`, at, note: 'Correction requested', actor: { type: 'user', source: 'Owner' } } });
function fixture(client = new FakeDynamoClient()) {
 const store = new DynamoStore(client, 'profiles-test');
 return { client, store, app: new ProfileService(store, () => at, 'empty'), reload: () => new ProfileService(new DynamoStore(client, 'profiles-test'), () => at, 'empty') };
}
function request(body, query = '') {
 return new Request(`https://app.example/api/me/profile-state${query}`, body ? { method: 'POST', headers: { origin: 'https://app.example', 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
}

test('DynamoDB keys preserve verified-subject ownership and reject demo identities', () => {
 assert.equal(ownerPartition(A), `USER#${A}`);
 assert.notEqual(ownerPartition(A), ownerPartition(B));
 assert.deepEqual(plain(entityKey(A, 'PROFILE')), { PK: `USER#${A}`, SK: 'PROFILE' });
 assert.equal(entityKey(A, 'COMMITMENT', 'c').SK, 'COMMITMENT#c');
 assert.equal(entityKey(A, 'EVIDENCE', 'outcome:c').SK, 'EVIDENCE#outcome:c');
 assert.throws(() => ownerPartition('demo-visitor'), /private owner/);
 assert.throws(() => ownerPartition('dev-user-001'), /private owner/);
 assert.throws(() => entityKey(A, 'COMMITMENT', ''), /record key/);
});
test('first private read atomically creates only an empty profile; later reads do not write', async () => {
 const { app, client, reload } = fixture();
 const first = await app.read(A);
 assert.equal(first.profile.about.name, ''); assert.equal(first.state.evidence.length, 0);
 assert.equal(client.items.size, 1); assert.equal(client.writes()[0].input.TransactItems.length, 1);
 const item = client.items.get(key(entityKey(A, 'PROFILE')));
 assert.equal(item.revision, 1); assert.equal(item.data.ownerId, A);
 await reload().read(A); assert.equal(client.writes().length, 1);
});
test('commitments round-trip optional fields and preserve insertion order across paginated reloads', async () => {
 const { app, client, reload } = fixture();
 await app.execute(A, create('z')); await app.execute(A, create('a')); await app.execute(A, create('m'));
 client.pageSize = 1;
 const view = await reload().read(A);
 assert.deepEqual(plain(view.state.commitments.map(c=>c.id)), ['m', 'a', 'z']);
 assert.deepEqual(plain(view.state.commitments[0].visibility), []);
 assert.equal('dueAt' in view.state.commitments[0], false);
 assert.ok(client.commands.some(c=>c.name==='QueryCommand' && c.input.ExclusiveStartKey));
 assert.ok(client.commands.every(c=>c.name!=='ScanCommand'));
});
test('completion and observed evidence publish in one transaction, without rewriting unrelated records', async () => {
 const { app, client, reload } = fixture();
 await app.execute(A, create('c')); await app.execute(A, create('other'));
 await app.execute(A, { type: 'complete', id: 'c', at });
 const writes = client.writes().at(-1).input.TransactItems.map(i=>i.Put);
 assert.deepEqual(writes.map(w=>w.Item.SK).sort(), ['COMMITMENT#c', 'EVIDENCE#outcome:c', 'PROFILE']);
 assert.equal(writes[0].ConditionExpression, '#revision = :expected');
 const view = await reload().read(A);
 assert.equal(view.state.commitments.find(c=>c.id==='c').status, 'completed');
 assert.equal(view.state.evidence[0].sourceType, 'observed');
 assert.equal(view.reliability.result.followThroughRate, 100);
});
test('Evidence v2 corrections, dispute history, resolution and revocation survive adapter recreation', async () => {
 const { app, reload } = fixture();
 await app.execute(A, create('c')); await app.execute(A, { type:'complete', id:'c', at });
 await app.execute(A, evidence('disputed'));
 assert.equal((await reload().read(A)).reliability.result.eligibleCommitments, 0);
 await app.execute(A, evidence('corrected', { title: 'Corrected title' }));
 await app.execute(A, evidence('dispute-resolved'));
 assert.equal((await reload().read(A)).reliability.result.eligibleCommitments, 1);
 await app.execute(A, evidence('revoked'));
 const view = await reload().read(A);
 assert.equal(view.reliability.result.eligibleCommitments, 0);
 assert.equal(view.state.evidence[0].title, 'Corrected title');
 assert.deepEqual(plain(view.state.evidence[0].auditHistory.map(e=>e.action)), ['created','disputed','corrected','dispute-resolved','revoked']);
 assert.equal(view.state.evidence[0].auditHistory[2].previous.title, 'Private commitment');
});
test('failed transaction publishes neither completion nor evidence and returns no success', async () => {
 const { app, client, reload } = fixture();
 await app.execute(A, create('c'));
 const before = plain([...client.items]);
 client.failure = new Error('DynamoDB unavailable');
 await assert.rejects(app.execute(A,{type:'complete',id:'c',at}), /unavailable/);
 assert.deepEqual(plain([...client.items]), before);
 client.failure = undefined;
 const view = await reload().read(A);
 assert.equal(view.state.commitments[0].status, 'active'); assert.equal(view.state.evidence.length, 0);
});
test('application callback failure leaves durable data unchanged', async () => {
 const { app, store, client } = fixture();await app.read(A);
 const before = plain([...client.items]);
 await assert.rejects(store.transaction(A, async r=>{const profile=await r.profile.get(A);profile.about.name='not committed';await r.profile.save(profile);throw new Error('abort');}),/abort/);
 assert.deepEqual(plain([...client.items]), before);
});
test('overlapping writers cannot overwrite each other; losing writer receives a conflict without replay', async () => {
 const { app, client } = fixture(); await app.read(A);
 let count = 0, release;const both = new Promise(resolve=>{release=resolve;});
 client.beforeTransact=async()=>{if(++count===2)release();await both;};
 const results=await Promise.allSettled([app.execute(A,create('one')),fixture(client).app.execute(A,create('two'))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.match(results.find(r=>r.status==='rejected').reason.message,/concurrently/);
 assert.equal(count,2);
 client.beforeTransact=undefined;
 assert.equal((await app.read(A)).state.commitments.length,1);
});
test('concurrent first initialization cannot replace another owner snapshot', async () => {
 const { app, client } = fixture();
 let count=0,release;const barrier=new Promise(resolve=>{release=resolve;});
 client.beforeTransact=async()=>{if(++count===2)release();await barrier;};
 const result=await Promise.allSettled([app.execute(A,create('first')),fixture(client).app.read(A)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(result.filter(r=>r.status==='rejected').length,1);
 assert.equal(client.items.get(key(entityKey(A,'PROFILE'))).revision,1);
});
test('unknown response after commit is surfaced and never replayed with another token', async () => {
 const { app, client }=fixture();await app.execute(A,create('c'));
 client.failAfterCommit=true;const count=client.writes().length;
 await assert.rejects(app.execute(A,{type:'complete',id:'c',at}),/Response lost/);
 assert.equal(client.writes().length,count+1);
 client.failAfterCommit=false;
 const view=await app.read(A);assert.equal(view.state.evidence.length,1);assert.equal(view.state.commitments[0].status,'completed');
});
test('revision fencing retries a read interrupted by a concurrent transaction', async () => {
 const { app, client }=fixture();await app.execute(A,create('c'));
 client.afterQuery=async()=>{client.afterQuery=undefined;await fixture(client).app.execute(A,{type:'complete',id:'c',at});};
 const view=await app.read(A);
 assert.equal(view.state.commitments[0].status,'completed');assert.equal(view.state.evidence.length,1);
});
test('different owners use separate partitions even for identical record IDs', async () => {
 const { app, client, store }=fixture();await app.execute(A,create('same','A'));await app.execute(B,create('same','B'));
 assert.equal((await app.read(A)).state.commitments[0].title,'A');assert.equal((await app.read(B)).state.commitments[0].title,'B');
 assert.ok(client.items.has(key(entityKey(A,'COMMITMENT','same'))));assert.ok(client.items.has(key(entityKey(B,'COMMITMENT','same'))));
 await store.transaction(A,async r=>{
  await assert.rejects(r.profile.get(B),/scope/);await assert.rejects(r.commitments.listForUser(B),/scope/);
  await assert.rejects(r.evidence.getById(B,'x'),/scope/);await assert.rejects(r.profile.save({ownerId:B}),/scope/);
 });
});
test('private HTTP input cannot select another DynamoDB partition', async () => {
 const { app }=fixture();const runA=ownerHandler(async()=>({subject:'user_A'}),async()=>app,()=> 'dynamodb');
 await app.execute(B,create('b-only'));
 let response=await runA(request(null,'?userId=user_B&ownerId='+B));let body=await response.json();
 assert.equal(body.state.commitments.length,0);assert.equal(body.mode,'owner-dynamodb');
 response=await runA(request({...create('a-only'),ownerId:B,userId:'user_B'}));assert.equal(response.status,200);
 response=await runA(request({type:'complete',id:'b-only',ownerId:B}));assert.notEqual(response.status,200);
 assert.deepEqual(plain((await app.read(B)).state.commitments.map(c=>[c.id,c.status])),[['b-only','active']]);
 assert.equal((await app.read(A)).state.commitments[0].ownerId,A);
});
test('corrupt schema/owner data fail closed instead of reseeding or crossing partitions', async () => {
 for (const corrupt of [item=>item.schemaVersion=2,item=>item.data.ownerId=B,item=>item.PK=ownerPartition(B)]) {
  const { app, client }=fixture();await app.read(A);
  corrupt(client.items.get(key(entityKey(A,'PROFILE'))));const count=client.writes().length;
  await assert.rejects(app.read(A),/Invalid/);assert.equal(client.writes().length,count);
 }
});
test('orphaned records and foreign pagination cursors are rejected', async () => {
 const {app,client}=fixture();await app.execute(A,create('c'));client.items.delete(key(entityKey(A,'PROFILE')));
 await assert.rejects(app.read(A),/Inconsistent/);
 const f=fixture();const send=f.client.send.bind(f.client);
 f.client.send=async command=> command.constructor.name==='QueryCommand' ? {Items:[],LastEvaluatedKey:{PK:ownerPartition(B),SK:'PROFILE'}} : send(command);
 await assert.rejects(f.app.read(A),/cursor/);
});
test('oversized records and transactions fail before any write, never split into batches', async () => {
 const {app,store,client}=fixture();await app.execute(A,create('c'));
 const original=(await app.read(A)).state.commitments[0];let count=client.writes().length;
 await assert.rejects(store.transaction(A,async r=>{await r.commitments.save({...original,description:'x'.repeat(310*1024)});}),/size/);
 assert.equal(client.writes().length,count);
 await assert.rejects(store.transaction(A,async r=>{for(let i=0;i<100;i++)await r.commitments.save({...original,id:'extra'+i});}),/Too many/);
 assert.equal(client.writes().length,count);
 await assert.rejects(store.transaction(A,async r=>{for(let i=0;i<12;i++)await r.commitments.save({...original,id:'large'+i,description:'x'.repeat(280*1024)});}),/transaction exceeds/);
 assert.equal(client.writes().length,count);
});
test('runtime selection defaults files only in development, and production cannot use ephemeral or file fallback', () => {
 assert.equal(ownerStorageMode({}),'local');assert.equal(ownerStorageMode({HUMAN_PROFILE_MODE:'public-demo'}),'local');
 assert.equal(ownerStorageMode({HUMAN_PROFILE_OWNER_STORAGE:'dynamodb'}),'dynamodb');
 assert.equal(ownerStorageMode({VERCEL:'1'}),'dynamodb');assert.equal(ownerStorageMode({NODE_ENV:'production'}),'dynamodb');
 assert.throws(()=>ownerStorageMode({VERCEL:'1',HUMAN_PROFILE_OWNER_STORAGE:'file'}),/require DynamoDB/);
 assert.throws(()=>ownerStorageMode({HUMAN_PROFILE_OWNER_STORAGE:'temporary'}),/Unsupported/);
});
test('missing production settings and unsafe endpoints fail without an AWS request or fallback', async () => {
 await assert.rejects(createOwnerService({VERCEL:'1'}),/HUMAN_PROFILE_DYNAMODB_TABLE/);
 for (const env of [{},{HUMAN_PROFILE_DYNAMODB_TABLE:'profiles-test'},{AWS_REGION:'us-east-1'}]) assert.throws(()=>dynamoConfiguration(env),/requires/);
 const base={HUMAN_PROFILE_DYNAMODB_TABLE:'profiles-test',AWS_REGION:'us-east-1'};
 assert.equal(dynamoConfiguration(base).region,'us-east-1');
 assert.equal(dynamoConfiguration({...base,HUMAN_PROFILE_DYNAMODB_ENDPOINT:'http://localhost:8000'}).endpoint,'http://localhost:8000');
 assert.throws(()=>dynamoConfiguration({...base,VERCEL:'1',HUMAN_PROFILE_DYNAMODB_ENDPOINT:'http://localhost:8000'}),/not allowed/);
 assert.throws(()=>dynamoConfiguration({...base,HUMAN_PROFILE_DYNAMODB_ENDPOINT:'https://foreign.example'}),/loopback/);
 assert.ok(createDynamoStore({...base,tableName:'profiles-test',region:'us-east-1'}) instanceof DynamoStore);
});
test('private errors expose configuration/conflict status but no infrastructure secrets', async () => {
 const run=ownerHandler(async()=>({subject:'user_A'}),()=>createOwnerService({VERCEL:'1'}),()=> 'dynamodb');
 const result=await run(request());assert.equal(result.status,503);assert.match((await result.json()).error,/not configured/);
 const f=fixture();await f.app.read(A);f.client.failure=cancelled();
 const conflict=await ownerHandler(async()=>({subject:'user_A'}),async()=>f.app,()=> 'dynamodb')(request(create('c')));
 assert.equal(conflict.status,409);assert.equal(conflict.headers.get('cache-control'),'private, no-store');
});
test('anonymous demo ignores DynamoDB configuration, preserves seed, and cannot write private keys', async () => {
 const store=await selectRepository({VERCEL:'1',HUMAN_PROFILE_OWNER_STORAGE:'dynamodb',HUMAN_PROFILE_DYNAMODB_TABLE:'missing-table'});
 assert.ok(store instanceof DemoStore);
 const identity=demoSession(new Request('https://app.example/api/profile-state'));
 const view=await new ProfileService(store,()=>at).read(identity.userId);
 assert.equal(view.profile.about.name,'Alex Morgan');assert.equal(view.state.evidence.length,136);
 const f=fixture();await assert.rejects(f.app.read(identity.userId),/private owner key/);assert.equal(f.client.commands.length,0);
});
test('domain and application remain free of AWS dependencies and DynamoDB keys', () => {
 for(const directory of ['domain','application'])for(const file of fs.readdirSync(directory,{recursive:true})){
  if(!file.endsWith('.ts'))continue;const source=fs.readFileSync(join(directory,file),'utf8');
  assert.doesNotMatch(source, /@aws-sdk|TransactWrite|DynamoDB|USER#/);
 }
});
