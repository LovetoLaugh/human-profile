const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript: load, plain } = require('./helpers/load-typescript.cjs');
const { calculateReliability, commitmentsInWindow } = load('domain/patterns/reliability.ts');
const { createCommitment, completeCommitment, missCommitment, cancelCommitment, deadlineFromLocalDate } = load('domain/commitments/service.ts');
const { applyCommitmentAction } = load('domain/commitments/pipeline.ts');
const { createCommitmentSeed } = load('data/mocks/commitments.ts');
const { reliabilityProfile } = load('domain/patterns/reliability-profile.ts');

const createdAt = '2026-09-01T12:00:00.000Z';
const dueAt = '2026-09-12T18:00:00.000Z';
function active(id = 'test', overrides = {}) {
 return createCommitment({ title: 'Build evidence engine', category: 'learning', dueAt, visibility: [], ...overrides }, id, createdAt);
}
const fixtures = (count, status) => Array.from({ length: count }, (_, i) => ({ ...active(`${status}-${i}`), status }));

test('all completed: 10 completed yields 100%', () => {
 assert.equal(calculateReliability(fixtures(10, 'completed')).followThroughRate, 100);
});
test('late and missed both remain in denominator: 8/10 yields 80%', () => {
 const result = calculateReliability([...fixtures(8, 'completed'), ...fixtures(1, 'completed-late'), ...fixtures(1, 'missed')]);
 assert.equal(result.followThroughRate, 80);
 assert.equal(result.completedLate, 1);
 assert.equal(result.missed, 1);
 assert.equal(result.eligibleCommitments, 10);
});
for (const status of ['active', 'cancelled']) test(`${status} commitments never reduce reliability`, () => {
 const result = calculateReliability([...fixtures(10, 'completed'), ...fixtures(5, status)]);
 assert.equal(result.followThroughRate, 100);
 assert.equal(result.eligibleCommitments, 10);
 assert.equal(result[status], 5);
});
test('no eligible commitments returns a finite zero with low confidence', () => {
 for (const input of [[], [...fixtures(2, 'active'), ...fixtures(3, 'cancelled')]]) {
  const result = calculateReliability(input);
  assert.equal(result.followThroughRate, 0);
  assert.equal(result.confidence, 'low');
  assert.equal(result.eligibleCommitments, 0);
 }
});
for (const [count, confidence] of [[3,'low'],[4,'low'],[5,'medium'],[10,'medium'],[19,'medium'],[20,'high'],[30,'high']]) {
 test(`confidence at ${count} observations is ${confidence}`, () => {
  assert.equal(calculateReliability(fixtures(count, 'completed')).confidence, confidence);
 });
}
test('observation identity prevents duplicate counting', () => {
 const observation = fixtures(1, 'completed')[0];
 assert.equal(calculateReliability([observation, observation]).eligibleCommitments, 1);
});
test('completion before or exactly at the deadline is on time', () => {
 for (const at of ['2026-09-12T17:59:59.999Z', dueAt, '2026-09-12T13:00:00-05:00']) {
  assert.equal(completeCommitment(active(), at).commitment.status, 'completed');
 }
});
test('one millisecond after the deadline is completed-late', () => {
 const transition = completeCommitment(active(), '2026-09-12T18:00:00.001Z');
 assert.equal(transition.commitment.status, 'completed-late');
 assert.equal(transition.evidence.metadata.outcome, 'completed-late');
});
test('completion without a deadline counts as on time', () => {
 assert.equal(completeCommitment(active('no-due', { dueAt: undefined }), dueAt).commitment.status, 'completed');
});
test('all outcome services create observed, unverified evidence and preserve visibility', () => {
 for (const resolve of [completeCommitment, missCommitment, cancelCommitment]) {
  const original = active('visibility', { visibility: ['employer'] });
  const before = plain(original);
  const { commitment, evidence } = resolve(original, dueAt);
  assert.deepEqual(plain(original), before, 'does not mutate input');
  assert.equal(evidence.type, 'commitment-outcome');
  assert.equal(evidence.sourceType, 'observed');
  assert.equal(evidence.verificationStatus, 'unverified');
  assert.equal(evidence.kind, 'Observed');
  assert.equal(evidence.relatedPattern, 'reliability');
  assert.equal(evidence.metadata.commitmentId, original.id);
  assert.equal(evidence.metadata.expectedAt, dueAt);
  assert.equal(commitment.evidenceIds[0], evidence.id);
  assert.deepEqual(plain(evidence.visibility), ['employer']);
  if (resolve !== completeCommitment) assert.equal(evidence.metadata.completedAt, undefined);
 }
});
test('terminal outcomes cannot be rewritten and dates must be valid', () => {
 const complete = completeCommitment(active(), dueAt).commitment;
 assert.throws(() => completeCommitment(complete, dueAt), /already has an outcome/);
 assert.throws(() => missCommitment(complete, dueAt), /already has an outcome/);
 assert.throws(() => completeCommitment(active(), 'not-a-date'), /valid timestamp/);
 assert.throws(() => completeCommitment(active(), '2026-08-01T00:00:00Z'), /precede creation/);
});
test('creation validates title, category, audiences, and deadline', () => {
 assert.throws(() => active('blank', { title: '  ' }), /title/);
 assert.throws(() => active('category', { category: 'unknown' }), /category/);
 assert.throws(() => active('prototype', { category: '__proto__' }), /category/);
 assert.throws(() => active('invalid-date', { dueAt: '2026-02-30T12:00:00Z' }), /timestamp/);
 assert.throws(() => active('audience', { visibility: ['unknown'] }), /audience/);
 assert.throws(() => active('date', { dueAt: 'tomorrow' }), /timestamp/);
 assert.equal(active('trim', { title: '  Learn  ' }).title, 'Learn');
 assert.equal(deadlineFromLocalDate(''), undefined);
 assert.throws(() => deadlineFromLocalDate('2026-02-30'), /valid due date/);
 const date = new Date(deadlineFromLocalDate('2026-09-12'));
 assert.equal(date.getDate(), 12);
 assert.equal(date.getHours(), 23);
 assert.equal(date.getMinutes(), 59);
});
test('pipeline adds no evidence until resolved and records outcomes exactly once', () => {
 let state = { commitments: [], evidence: [], asOf: createdAt };
 state = applyCommitmentAction(state, { type: 'create', input: { title: 'Read', category: 'learning', visibility: [] }, id: 'new', at: createdAt });
 assert.equal(state.evidence.length, 0);
 state = applyCommitmentAction(state, { type: 'complete', id: 'new', at: dueAt });
 assert.equal(state.evidence.length, 1);
 assert.equal(state.commitments[0].evidenceIds[0], state.evidence[0].id);
 const repeated = applyCommitmentAction(state, { type: 'complete', id: 'new', at: dueAt });
 assert.equal(repeated, state);
 assert.equal(applyCommitmentAction(state, { type: 'miss', id: 'new', at: dueAt }), state);
 assert.throws(() => applyCommitmentAction(state, { type: 'cancel', id: 'missing', at: dueAt }), /not found/);
});
test('deterministic history produces 50 completed, 2 late, 1 missed, 3 cancelled, 2 active', () => {
 const seed = createCommitmentSeed();
 assert.deepEqual(plain(seed), plain(createCommitmentSeed()));
 const result = calculateReliability(seed.commitments);
 assert.equal(result.completed, 50); assert.equal(result.completedLate, 2); assert.equal(result.missed, 1);
 assert.equal(result.cancelled, 3); assert.equal(result.active, 2);
 assert.equal(result.followThroughRate, 94.34);
 assert.ok(seed.evidence.every(e => e.sourceType === 'observed' && e.verificationStatus === 'unverified'));
});
test('the shared read model includes only evidence used for its calculation', () => {
 let state = createCommitmentSeed();
 let view = reliabilityProfile(state);
 assert.equal(view.evidence.length, 53);
 assert.ok(view.evidence.every(e => e.metadata.outcome !== 'cancelled'));
 state = applyCommitmentAction(state, { type: 'miss', id: 'active-work', at: '2026-09-11T00:00:00Z' });
 view = reliabilityProfile(state);
 assert.equal(view.result.eligibleCommitments, 54);
 assert.equal(view.result.missed, 2);
 assert.equal(view.result.followThroughRate, 92.59);
 assert.equal(view.pattern.value, '93%');
 assert.equal(view.evidence.length, 54);
 assert.ok(view.pattern.evidenceIds.includes('outcome:active-work'));
 const cancelled = applyCommitmentAction(state, { type: 'cancel', id: 'active-family', at: '2026-09-11T01:00:00Z' });
 assert.equal(reliabilityProfile(cancelled).result.followThroughRate, view.result.followThroughRate);
});
test('six-month window excludes old and future outcomes, preserving its inclusive boundary', () => {
 const dates = ['2026-02-28T11:59:59.999Z', '2026-02-28T12:00:00.000Z', '2026-08-31T12:00:00.000Z', '2026-08-31T12:00:00.001Z'];
 const history = dates.map((resolvedAt, i) => ({ ...fixtures(1, 'completed')[0], id: String(i), resolvedAt }));
 assert.deepEqual(plain(commitmentsInWindow(history, '2026-08-31T12:00:00.000Z').map(c => c.id)), ['1','2']);
});
