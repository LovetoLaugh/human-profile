const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadTypeScript, plain } = require('./helpers/load-typescript.cjs');
const { FakeDynamoClient } = require('./helpers/fake-dynamodb.cjs');
const { SharingService } = loadTypeScript('application/sharing-service.ts');
const { ProfileService } = loadTypeScript('application/profile-service.ts');
const { MemoryStore } = loadTypeScript('persistence/memory-store.ts');
const { FileStore } = loadTypeScript('persistence/file-store.ts');
const { DynamoStore } = loadTypeScript('persistence/dynamodb-store.ts');
const { privateOwnerKey } = loadTypeScript('server/owner-identity.ts');
const { ownerSharingHandler, recipientSharingHandler } = loadTypeScript('server/sharing-http.ts');
const { verifiedRecipient } = loadTypeScript('server/recipient-identity.ts');
const { signInReturn } = loadTypeScript('server/sign-in-return.ts');
const { shareInput, validShare } = loadTypeScript('domain/sharing/share.ts');
const A = privateOwnerKey({ subject: 'owner_A' }), B = privateOwnerKey({ subject: 'owner_B' });
const recipient = { subject: 'recipient_1', verifiedEmails: ['RECIPIENT@example.test'] };
const other = { subject: 'recipient_2', verifiedEmails: ['other@example.test'] };
const now = '2026-10-07T12:00:00.000Z', expiry = '2026-10-08T12:00:00.000Z';
const draft = () => ({ purpose: 'Project collaboration', audience: 'employer', evidenceIds: ['outcome:selected'], recipientEmail: 'recipient@example.test', expiresAt: expiry });
function request(body, path = '/api/me/shares') { return new Request('https://app.example'+path, body ? { method: 'POST', headers: { origin: 'https://app.example', 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}); }
async function fixture(store = new MemoryStore()) {
 let time = now;
 const clock = () => time;
 const profile = new ProfileService(store, clock, 'empty');
 let view = await profile.read(A);
 view.profile.permissions.evidence.employer = true; view.profile.permissions.work.employer = true;
 view.profile.about.name = 'PRIVATE NAME'; view.profile.about.about = 'PRIVATE BIO';
 await profile.execute(A, { type: 'profile', profile: view.profile });
 for (const id of ['selected','unselected']) {
  await profile.execute(A, { type: 'create', id, input: { title: id, category: 'work', visibility: ['employer'] } });
  await profile.execute(A, { type: 'complete', id });
 }
 const sharing = new SharingService(store, randomUUID, clock);
 return { store, sharing, profile, setTime(value) { time = value; }, recreate() { return new SharingService(store, randomUUID, clock); } };
}

test('share input requires purpose, future expiry, recipient, audience and explicit bounded selection', () => {
 for (const invalid of [{purpose:''},{recipientEmail:'bad'},{audience:'public'},{evidenceIds:[]},{evidenceIds:['a','a']},{evidenceIds:Array.from({length:51},(_,i)=>String(i))},{expiresAt:now},{expiresAt:'invalid'}]) assert.throws(()=>shareInput({...draft(),...invalid},now));
 assert.equal(shareInput({...draft(),recipientEmail:'  RECIPIENT@example.test '},now).recipientEmail,'recipient@example.test');
 assert.equal(validShare({...draft(),id:'x',createdAt:now,recipientSubject:'forged'}),false);
});
test('matching verified recipient accepts once, binds subject and sees exactly the preview allowlist', async () => {
 const f=await fixture(); const preview=await f.sharing.preview(A,draft());const created=await f.sharing.create(A,draft());
 assert.deepEqual(plain(created.view),plain(preview));
 assert.deepEqual(plain(await f.sharing.recipient(A,created.id,recipient)),{status:'accept'});
 const result=await f.sharing.recipient(A,created.id,recipient,true);
 assert.deepEqual(plain(result.view),plain(preview));assert.equal(result.view.evidence.length,1);
 assert.deepEqual(Object.keys(result.view.evidence[0]).sort(),['id','title','description','sourceType','verificationStatus','timestamp','createdAt'].sort());
 const serialized=JSON.stringify(result);for(const excluded of ['PRIVATE NAME','PRIVATE BIO','unselected','auditHistory','ownerId','permissions','commitments','recipientEmail','recipientSubject','sourceId','metadata','reliability']) assert.ok(!serialized.includes(excluded),excluded);
 const stored=await f.store.transaction(A,r=>r.shares.getById(A,created.id));assert.equal(stored.recipientSubject,recipient.subject);
 // Email changes cannot transfer an already accepted grant to another subject.
 assert.equal((await f.recreate().recipient(A,created.id,{subject:recipient.subject,verifiedEmails:[]})).status,'active');
 await assert.rejects(f.sharing.recipient(A,created.id,{subject:other.subject,verifiedEmails:recipient.verifiedEmails},true));
});
test('unverified email, wrong recipient, unknown grant and wrong owner have indistinguishable unavailable responses', async () => {
 const f=await fixture();const {id}=await f.sharing.create(A,draft());
 const identities=[other,{subject:'unverified',verifiedEmails:[]}];
 for(const identity of identities) {
  const handler=recipientSharingHandler(async()=>identity,async()=>f.sharing);
  for(const owner of [A,B]) {
   const result=await handler(request(),owner,id);assert.equal(result.status,404);assert.deepEqual(await result.json(),{error:'This invitation is unavailable for this account.'});
  }
 }
 const handler=recipientSharingHandler(async()=>recipient,async()=>f.sharing);
 assert.equal((await handler(request(),A,randomUUID())).status,404);
});
test('Clerk recipient mapper uses only verified server emails and rejects mismatched user records', () => {
 const identity=verifiedRecipient('subject',{id:'subject',emailAddresses:[{emailAddress:'allowed@example.test',verification:{status:'verified'}},{emailAddress:'unverified@example.test',verification:{status:'unverified'}},{emailAddress:'missing@example.test',verification:null}]});
 assert.deepEqual(plain(identity),{subject:'subject',verifiedEmails:['allowed@example.test']});
 assert.throws(()=>verifiedRecipient('subject',{id:'other',emailAddresses:[]}));assert.throws(()=>verifiedRecipient('subject',null));
});
test('every read rechecks expiry, with no TTL dependency or metadata disclosure to wrong recipients', async () => {
 const f=await fixture();const {id}=await f.sharing.create(A,draft());await f.sharing.recipient(A,id,recipient,true);
 f.setTime(expiry);assert.deepEqual(plain(await f.sharing.recipient(A,id,recipient)),{status:'expired'});
 await assert.rejects(f.sharing.recipient(A,id,other));assert.equal((await f.sharing.ownerPreview(A,id)).status,'expired');
});
test('revocation is owner-scoped and prevents both future acceptance and reads', async () => {
 const f=await fixture();const {id}=await f.sharing.create(A,draft());
 await assert.rejects(f.sharing.revoke(B,id));await f.sharing.revoke(A,id);await f.sharing.revoke(A,id);
 assert.deepEqual(plain(await f.sharing.recipient(A,id,recipient,true)),{status:'revoked'});
 assert.equal((await f.sharing.list(A))[0].status,'revoked');
 assert.deepEqual(plain(await f.sharing.list(B)),[]);
});
test('permission removal, individual visibility, disputes and revocation remove evidence on the next read', async () => {
 for (const change of ['evidence-permission','category-permission','visibility','disputed','revoked']) {
  const f=await fixture();const {id}=await f.sharing.create(A,draft());await f.sharing.recipient(A,id,recipient,true);
  await f.store.transaction(A,async r=>{
   if(change.endsWith('permission')) { const p=await r.profile.get(A);p.permissions[change==='evidence-permission'?'evidence':'work'].employer=false;await r.profile.save(p); }
   else {const e=await r.evidence.getById(A,'outcome:selected');if(change==='visibility')e.visibility=[];else e.verificationStatus=change;await r.evidence.save(e);}
  });
  assert.equal((await f.sharing.recipient(A,id,recipient)).view.evidence.length,0,change);
  await assert.rejects(f.sharing.create(A,draft()));
 }
});
test('current permitted text is shown, while newly created or unselected records never join a share', async () => {
 const f=await fixture();const {id}=await f.sharing.create(A,draft());await f.sharing.recipient(A,id,recipient,true);
 await f.store.transaction(A,async r=> {const e=await r.evidence.getById(A,'outcome:selected');await r.evidence.save({...e,title:'Current corrected title',auditHistory:[...e.auditHistory,{note:'SECRET NOTE'}]});await r.evidence.save({...e,id:'new',title:'NEW SECRET'});});
 const view=(await f.sharing.recipient(A,id,recipient)).view;assert.equal(view.evidence[0].title,'Current corrected title');assert.equal(view.evidence.length,1);assert.ok(!JSON.stringify(view).includes('SECRET'));
});
test('preview and creation reject absent, foreign and ineligible evidence; save rechecks permissions after preview', async () => {
 const f=await fixture();await f.sharing.preview(A,draft());
 for(const evidenceIds of [['missing'],['outcome:selected','missing']]) await assert.rejects(f.sharing.create(A,{...draft(),evidenceIds}));
 await assert.rejects(f.sharing.create(B,draft()));
 await f.store.transaction(A,async r=>{const p=await r.profile.get(A);p.permissions.evidence.employer=false;await r.profile.save(p);});
 await assert.rejects(f.sharing.create(A,draft()));assert.equal((await f.sharing.list(A)).length,0);
});
test('owner HTTP boundary ignores forged ownership and recipient subject fields', async () => {
 const f=await fixture(); const handler=ownerSharingHandler(async()=>({subject:'owner_A'}),async()=>f.sharing);
 const result=await handler(request({action:'create',ownerId:B,input:{...draft(),ownerId:B,recipientSubject:other.subject,acceptedAt:now}}));assert.equal(result.status,201);
 const {id,path}=await result.json();assert.equal(path,`/shared/${A}/${id}`);assert.equal((await f.sharing.list(B)).length,0);
 assert.equal((await f.sharing.recipient(A,id,recipient)).status,'accept');
 const revoke=ownerSharingHandler(async()=>({subject:'owner_B'}),async()=>f.sharing);
 assert.equal((await revoke(request({action:'revoke',id,ownerId:A}))).status,404);
});
test('recipient HTTP payload cannot impersonate verified identity or mutate the share', async () => {
 const f=await fixture();const {id}=await f.sharing.create(A,draft());
 const handler=recipientSharingHandler(async()=>other,async()=>f.sharing);
 const result=await handler(request({action:'accept',subject:recipient.subject,verifiedEmails:recipient.verifiedEmails,ownerId:A}),A,id);assert.equal(result.status,404);
 const correct=recipientSharingHandler(async()=>recipient,async()=>f.sharing);
 assert.equal((await correct(request({action:'revoke'}),A,id)).status,400);
 assert.equal((await f.sharing.list(A))[0].status,'active');
});
test('anonymous sharing APIs return 401 without accessing storage; cross-origin acceptance is rejected', async () => {
 const storage=async()=>{throw new Error('must not touch storage');};
 const anonymous=ownerSharingHandler(async()=>null,storage);
 const response=await anonymous(request());assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
 const recipientHandler=recipientSharingHandler(async()=>null,storage);assert.equal((await recipientHandler(request(),A,randomUUID())).status,401);
 const foreign=recipientSharingHandler(async()=>recipient,storage);
 const bad=new Request('https://app.example/api/shared/x/y',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{"action":"accept"}'});
 assert.equal((await foreign(bad,A,randomUUID())).status,400);
});
test('repository share methods reject cross-owner reads/writes and return detached copies', async () => {
 const f=await fixture();const {id}=await f.sharing.create(A,draft());
 await f.store.transaction(A,async r=>{await assert.rejects(r.shares.getById(B,id));await assert.rejects(r.shares.listForUser(B));const s=await r.shares.getById(A,id);await assert.rejects(r.shares.save({...s,ownerId:B}));s.purpose='not saved';});
 assert.equal((await f.sharing.list(A))[0].purpose,draft().purpose);
});
test('local legacy files support share create/bind/revoke across adapter recreation without losing profile data', async () => {
 const dir=await fs.mkdtemp(join(tmpdir(),'hp-sharing-'));
 try {
  const f=await fixture(new FileStore(dir));const file=join(dir,`${A}.json`);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).shares,undefined);
  const {id}=await f.sharing.create(A,draft());
  const restored=new SharingService(new FileStore(dir),randomUUID,()=>now);await restored.recipient(A,id,recipient,true);
  assert.equal((await restored.recipient(A,id,recipient)).status,'active');await restored.revoke(A,id);
  const again=new SharingService(new FileStore(dir),randomUUID,()=>now);assert.equal((await again.recipient(A,id,recipient)).status,'revoked');
  assert.equal((await f.profile.read(A)).state.evidence.length,2);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('DynamoDB persists SHARE with PROFILE revision in one transaction and paginates grants', async () => {
 const client=new FakeDynamoClient();const f=await fixture(new DynamoStore(client,'profiles-test'));const {id}=await f.sharing.create(A,draft());
 const writes=client.writes().at(-1).input.TransactItems;assert.deepEqual(writes.map(w=>w.Put.Item.SK),['PROFILE',`SHARE#${id}`]);
 assert.equal(writes[0].Put.ConditionExpression,'#revision = :expected');client.pageSize=1;
 const restored=new SharingService(new DynamoStore(client,'profiles-test'),randomUUID,()=>now);
 assert.equal((await restored.list(A)).length,1);await restored.recipient(A,id,recipient,true);assert.equal((await restored.recipient(A,id,recipient)).status,'active');
 await restored.revoke(A,id);assert.equal((await restored.recipient(A,id,recipient)).status,'revoked');
 assert.ok(client.commands.every(c=>c.name!=='ScanCommand'));
});
test('DynamoDB failed acceptance/revocation publishes no partial state', async () => {
 const client=new FakeDynamoClient();const f=await fixture(new DynamoStore(client,'profiles-test'));const {id}=await f.sharing.create(A,draft());
 client.failure=new Error('failed');await assert.rejects(f.sharing.recipient(A,id,recipient,true));client.failure=undefined;
 assert.equal((await f.sharing.recipient(A,id,recipient)).status,'accept');await f.sharing.recipient(A,id,recipient,true);
 client.failure=new Error('failed');await assert.rejects(f.sharing.revoke(A,id));client.failure=undefined;
 assert.equal((await f.sharing.recipient(A,id,recipient)).status,'active');
});
test('DynamoDB concurrent acceptance binds only one subject even if both have the invited email', async () => {
 const client=new FakeDynamoClient();const f=await fixture(new DynamoStore(client,'profiles-test'));const {id}=await f.sharing.create(A,draft());
 let arrivals=0,release;const barrier=new Promise(r=>release=r);client.beforeTransact=async()=>{if(++arrivals===2)release();await barrier;};
 const rival={subject:'rival',verifiedEmails:recipient.verifiedEmails};
 const results=await Promise.allSettled([f.sharing.recipient(A,id,recipient,true),f.recreate().recipient(A,id,rival,true)]);
 client.beforeTransact=undefined;assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 const bound=await f.store.transaction(A,r=>r.shares.getById(A,id));const loser=bound.recipientSubject===recipient.subject?rival:recipient;await assert.rejects(f.sharing.recipient(A,id,loser));
});
test('DynamoDB revocation winning an acceptance race cannot be overwritten by stale acceptance', async () => {
 const client=new FakeDynamoClient();const f=await fixture(new DynamoStore(client,'profiles-test'));const {id}=await f.sharing.create(A,draft());
 let release,entered;const gate=new Promise(r=>release=r);const ready=new Promise(r=>entered=r);
 client.beforeTransact=async input=>{if(input.TransactItems.some(w=>w.Put.Item.data.recipientSubject)){entered();await gate;}};
 const accepting=f.sharing.recipient(A,id,recipient,true);await ready;await f.recreate().revoke(A,id);release();await assert.rejects(accepting,/concurrent/);client.beforeTransact=undefined;
 assert.equal((await f.sharing.recipient(A,id,recipient,true)).status,'revoked');
});
test('safe sign-in return accepts only exact local share paths, never arbitrary redirects', () => {
 const path=`/shared/${A}/${randomUUID()}`;assert.equal(signInReturn(path),path);
 for(const value of ['//evil.example','https://evil.example','/shared/../me',path+'?redirect=https://evil.example',path+'#fragment',undefined,['/me']])assert.equal(signInReturn(value),'/me');
});
test('shared routes bypass the anonymous demo provider entirely', () => {
 const ts=require('typescript'),vm=require('node:vm'),source=require('node:fs').readFileSync('components/ApplicationProviders.tsx','utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:id=>{
  if(id==='next/navigation')return {usePathname:()=>`/shared/${A}/${randomUUID()}`};
  if(id.includes('CommitmentProvider'))return {CommitmentProvider(){throw new Error('Demo provider must not render');}};
  return require(id);
 }});
 assert.equal(module.exports.ApplicationProviders({children:'recipient shell'}),'recipient shell');
});
test('DynamoDB permission changes racing share creation reject stale disclosure', async () => {
 const client=new FakeDynamoClient();const f=await fixture(new DynamoStore(client,'profiles-test'));
 let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 client.beforeTransact=async input=>{if(input.TransactItems.some(w=>w.Put.Item.SK.startsWith('SHARE#'))){entered();await gate;}};
 const creating=f.sharing.create(A,draft());await ready;
 await f.store.transaction(A,async r=>{const p=await r.profile.get(A);p.permissions.evidence.employer=false;await r.profile.save(p);});
 release();await assert.rejects(creating,/concurrent/);client.beforeTransact=undefined;
 assert.equal((await f.sharing.list(A)).length,0);
});
test('local concurrent acceptance and revocation serialize safely', async () => {
 const dir=await fs.mkdtemp(join(tmpdir(),'hp-sharing-race-'));
 try {
  const f=await fixture(new FileStore(dir));const {id}=await f.sharing.create(A,draft());
  const otherStore=new SharingService(new FileStore(dir),randomUUID,()=>now);
  const rival={subject:'rival',verifiedEmails:recipient.verifiedEmails};
  const results=await Promise.allSettled([f.sharing.recipient(A,id,recipient,true),otherStore.recipient(A,id,rival,true)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await otherStore.revoke(A,id);const bound=await f.store.transaction(A,r=>r.shares.getById(A,id));
  assert.equal((await f.sharing.recipient(A,id,{subject:bound.recipientSubject,verifiedEmails:[]})).status,'revoked');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
