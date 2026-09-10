const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Compile data-only TypeScript in memory; no extra test runtime or generated files.
function loadData(name, dependencies = {}) {
 const source = fs.readFileSync(path.join(__dirname, '../data', `${name}.ts`), 'utf8');
 const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
 const exports = {};
 vm.runInNewContext(code, { exports, require: id => {
  assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
  return dependencies[id];
 } });
 return exports;
}
const home = loadData('profile');
const data = loadData('profile-details', { './profile': home });
const { profileEvidence, profilePatterns, initialPermissions, canSeeEvidence, timelineEvents } = data;
const clone = value => JSON.parse(JSON.stringify(value));

test('127 unique evidence items match the displayed provenance totals', () => {
 assert.deepEqual(clone(data.evidenceCounts(profileEvidence)), { 'self-reported': 32, observed: 61, verified: 34, total: 127 });
 assert.equal(new Set(profileEvidence.map(e => e.id)).size, 127);
 for (const event of profileEvidence) {
  assert.ok(event.description && event.category && event.source);
  assert.ok(Number.isFinite(Date.parse(event.timestamp)));
  assert.equal(event.verificationStatus === 'mock-verified', event.sourceType === 'verified');
 }
});
test('reliability and all pattern cards trace to underlying evidence', () => {
 assert.deepEqual(clone(home.reliabilitySummary(profileEvidence)), { observed: 53, completed: 50, late: 2, missed: 1, percentage: 94 });
 for (const pattern of profilePatterns) {
  assert.ok(pattern.evidenceIds.length);
  for (const id of pattern.evidenceIds) assert.ok(profileEvidence.some(e => e.id === id));
 }
 assert.equal(profileEvidence.filter(e => e.pattern === 'relationships').length, 24);
 assert.equal(profileEvidence.filter(e => e.pattern === 'community').length, 18);
 assert.equal(profileEvidence.filter(e => e.pattern === 'growth').length, 8);
});
test('default audiences exclude private details and include intended evidence', () => {
 assert.equal(profileEvidence.filter(e => canSeeEvidence(e, 'me', initialPermissions)).length, 127);
 assert.equal(profileEvidence.filter(e => canSeeEvidence(e, 'public', initialPermissions)).length, 0);
 for (const audience of ['employer', 'landlord', 'neighbor']) {
  const records = profileEvidence.filter(e => canSeeEvidence(e, audience, initialPermissions));
  assert.ok(records.length);
  assert.ok(records.every(e => !['Well-being', 'Family', 'Relationships', 'Current State', 'Financial'].includes(e.category)));
  if (audience === 'employer') assert.ok(records.every(e => ['Work', 'Learning'].includes(e.category)));
  if (audience === 'landlord') assert.ok(records.every(e => e.category === 'Agreement'));
  if (audience === 'neighbor') assert.ok(records.every(e => e.category === 'Community'));
 }
});
test('category switches and selected evidence are independent', () => {
 const permissions = clone(initialPermissions);
 const work = profileEvidence.find(e => e.id === 'commitment-1');
 assert.equal(canSeeEvidence(work, 'employer', permissions), true);
 permissions.work.employer = false;
 assert.equal(canSeeEvidence(work, 'employer', permissions), false);
 assert.equal(permissions.evidence.employer, true);
 assert.equal(permissions.reliability.employer, true);
 permissions.work.employer = true;
 permissions.evidence.employer = false;
 assert.equal(canSeeEvidence(work, 'employer', permissions), false);
 permissions.evidence.public = true;
 permissions.work.public = true;
 assert.equal(canSeeEvidence(work, 'public', permissions), false);
});
test('timeline summaries link to records in their displayed periods', () => {
 for (const item of timelineEvents) {
  const linked = item.evidenceIds.map(id => profileEvidence.find(e => e.id === id));
  assert.ok(linked.length && linked.every(Boolean));
  if (item.group === 'Today') assert.ok(linked.every(e => e.timestamp.startsWith('2026-09-09')));
  if (item.group === 'Last month') assert.ok(linked.every(e => e.timestamp.startsWith('2026-08')));
 }
 assert.equal(timelineEvents.find(e => e.id === 't7').evidenceIds.length, 8);
 assert.equal(timelineEvents.find(e => e.id === 't9').evidenceIds.length, 3);
});
