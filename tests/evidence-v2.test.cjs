const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript, plain } = require('./helpers/load-typescript.cjs');
const svc = loadTypeScript('domain/evidence/services.ts');
const { profileEvidence, canSeeEvidence, initialPermissions } = loadTypeScript('data/profile-details.ts');
const { commitmentSeed } = loadTypeScript('data/mocks/commitments.ts');
const { applyCommitmentAction } = loadTypeScript('domain/commitments/pipeline.ts');
const { reliabilityProfile } = loadTypeScript('domain/patterns/reliability-profile.ts');
const { patternWithEvidence } = loadTypeScript('domain/patterns/evidence-profile.ts');
const external = { type: 'external-source', source: 'Reviewer (mock)', sourceId: 'mock-reviewer-42', demo: true };
const context = (id, note = 'Owner supplied reason', actor = { type: 'user', source: 'Owner' }) => ({ id, at: '2026-09-11T00:00:00Z', actor, note });
const original = () => profileEvidence.find(e => e.id === 'outcome:commitment-1');
function create(sourceType) {
 return svc.createEvidence({ id: 'new', type: 'activity', title: 'Learning session', description: 'Learning activity recorded.',
  sourceType, provenance: { observed: 'human-profile', 'self-reported': 'user', verified: 'external-source' }[sourceType],
  source: sourceType === 'verified' ? external.source : 'Owner log', sourceId: sourceType === 'verified' ? external.sourceId : undefined,
  timestamp: '2026-09-10T00:00:00Z', category: 'Learning', relatedPattern: 'growth', visibility: [], perspectives: [], icon: 'book',
 }, context('created:new', 'Creation', sourceType === 'verified' ? external : { type: sourceType === 'observed' ? 'human-profile' : 'user', source: 'Owner log' }));
}
for (const type of ['self-reported', 'observed', 'verified']) test(`creation captures ${type} origin and initial audit snapshot`, () => {
 const e = create(type);
 assert.equal(e.sourceType, type);
 assert.equal(e.verificationStatus, type === 'verified' ? 'verified' : 'unverified');
 assert.equal(e.auditHistory.length, 1);
 assert.equal(e.auditHistory[0].action, 'created');
 assert.equal(e.auditHistory[0].next.title, e.title);
 assert.equal(e.createdAt, '2026-09-11T00:00:00Z');
 if (type === 'verified') assert.equal(e.verificationSource.sourceId, external.sourceId);
});
test('request verification appends pending without changing observed origin; duplicate rejected', () => {
 const e = original(), before = plain(e);
 const pending = svc.requestEvidenceVerification(e, context('request'));
 assert.equal(pending.verificationStatus, 'pending');
 assert.equal(pending.sourceType, 'observed');
 assert.equal(pending.auditHistory.length, 2);
 assert.deepEqual(plain(e), before);
 assert.throws(() => svc.requestEvidenceVerification(pending, context('request-again')), /not allowed/);
});
test('verification captures independent source and does not rewrite original provenance', () => {
 const pending = svc.requestEvidenceVerification(original(), context('request'));
 const verified = svc.verifyEvidence(pending, external, context('verify', 'Mock confirmation', external));
 assert.equal(verified.sourceType, 'verified');
 assert.equal(verified.verificationStatus, 'verified');
 assert.equal(verified.provenance, 'human-profile');
 assert.deepEqual(plain(verified.verificationSource), external);
 assert.equal(verified.auditHistory[0].next.sourceType, 'observed');
 assert.throws(() => svc.verifyEvidence(verified, external, context('again', '', external)), /not allowed/);
 assert.ok(!svc.availableEvidenceActions(verified).includes('verification-requested'));
});
test('verification rejects missing source identity or a non-external confirming actor', () => {
 assert.throws(() => svc.verifyEvidence(original(), { ...external, sourceId: '' }, context('v', '', external)), /source ID/);
 assert.throws(() => svc.verifyEvidence(original(), external, context('v')), /attributed/);
 assert.throws(() => svc.verifyEvidence(original(), { ...external, type: 'user' }, context('v')), /external source/);
});
test('dispute requires a reason and excludes evidence until resolved', () => {
 assert.throws(() => svc.disputeEvidence(original(), context('d', '  ')), /reason/);
 const disputed = svc.disputeEvidence(original(), context('d'));
 assert.equal(disputed.verificationStatus, 'disputed');
 assert.equal(svc.contributesToPatterns(disputed), false);
 const restored = svc.resolveEvidenceDispute(disputed, context('r'));
 assert.equal(restored.verificationStatus, 'unverified');
 assert.equal(svc.contributesToPatterns(restored), true);
 assert.deepEqual(plain(restored.auditHistory.map(a => a.action)), ['created', 'disputed', 'dispute-resolved']);
 assert.throws(() => svc.disputeEvidence(disputed, context('again')), /not allowed/);
});
for (const status of ['pending', 'verified']) test(`resolution restores ${status} when no correction occurred`, () => {
 const e = status === 'pending' ? svc.requestEvidenceVerification(original(), context('p')) : svc.verifyEvidence(original(), external, context('v', '', external));
 const restored = svc.resolveEvidenceDispute(svc.disputeEvidence(e, context('d')), context('r'));
 assert.equal(restored.verificationStatus, status);
 if (status === 'verified') assert.deepEqual(plain(restored.verificationSource), external);
});
test('text correction retains original values and invalidates prior verification', () => {
 const verified = svc.verifyEvidence(original(), external, context('v', '', external));
 const corrected = svc.correctEvidence(verified, { title: 'Corrected PR title' }, context('c', 'Fixed title'));
 assert.equal(corrected.title, 'Corrected PR title');
 assert.equal(corrected.verificationStatus, 'unverified');
 assert.equal(corrected.sourceType, 'observed');
 assert.equal(corrected.verificationSource, undefined);
 assert.equal(corrected.auditHistory.at(-1).previous.title, original().title);
 assert.equal(corrected.auditHistory.at(-1).previous.verificationSource.sourceId, external.sourceId);
 assert.equal(corrected.auditHistory[0].next.title, original().title);
 assert.equal(verified.title, original().title);
 assert.throws(() => svc.correctEvidence(corrected, { title: corrected.title }, context('noop')), /must change/);
 assert.throws(() => svc.correctEvidence(corrected, { metadata: {} }, context('outcome')), /Only title/);
});
test('correcting a disputed record keeps it excluded until explicit resolution, then requires reverification', () => {
 const v = svc.verifyEvidence(original(), external, context('v', '', external));
 const d = svc.disputeEvidence(v, context('d'));
 const c = svc.correctEvidence(d, { description: 'Corrected description.' }, context('c'));
 assert.equal(c.verificationStatus, 'disputed');
 const r = svc.resolveEvidenceDispute(c, context('r'));
 assert.equal(r.verificationStatus, 'unverified');
 assert.equal(r.auditHistory.length, 5);
 assert.equal(r.verificationSource, undefined);
});
test('revocation retains the record and history and is terminal', () => {
 const e = svc.revokeEvidence(original(), context('revoke'));
 assert.equal(e.id, original().id);
 assert.equal(e.verificationStatus, 'revoked');
 assert.equal(e.auditHistory.length, 2);
 assert.equal(svc.contributesToPatterns(e), false);
 assert.deepEqual(plain(svc.availableEvidenceActions(e)), []);
 for (const action of ['verification-requested', 'disputed', 'dispute-resolved', 'revoked']) {
  assert.throws(() => svc.applyEvidenceCommand(e, { action }, context('x')), /not allowed/);
 }
});
test('audit rejects backdating and duplicate IDs, permits ordered same-time transitions', () => {
 const d = svc.disputeEvidence(original(), context('d'));
 assert.throws(() => svc.resolveEvidenceDispute(d, { ...context('r'), at: '2026-09-10T00:00:00Z' }), /chronological/);
 assert.throws(() => svc.resolveEvidenceDispute(d, context('d')), /Duplicate/);
 const r = svc.resolveEvidenceDispute(d, context('r'));
 assert.deepEqual(plain(r.auditHistory.slice(0, 2)), plain(d.auditHistory));
 assert.ok(r.auditHistory.every((entry, i, arr) => !i || Date.parse(entry.timestamp) >= Date.parse(arr[i - 1].timestamp)));
});
function stateWith(e) { return { ...commitmentSeed, evidence: profileEvidence.map(record => record.id === e.id ? e : record) }; }
for (const action of ['disputed', 'revoked']) test(`${action} outcome is excluded from reliability without changing the commitment`, () => {
 const e = svc.applyEvidenceCommand(original(), { action }, context(action));
 const state = stateWith(e), before = plain(state);
 const view = reliabilityProfile(state);
 assert.equal(view.result.eligibleCommitments, 52);
 assert.equal(view.result.completed, 49);
 assert.equal(view.result.followThroughRate, 94.23);
 assert.ok(!view.evidence.some(record => record.id === e.id));
 assert.deepEqual(plain(state), before);
});
test('resolved evidence restores the 50/53 fixture; verification does not add weight', () => {
 const d = svc.disputeEvidence(original(), context('d'));
 const r = svc.resolveEvidenceDispute(d, context('r'));
 const v = svc.verifyEvidence(r, external, context('v', '', external));
 for (const e of [r, v]) {
  const result = reliabilityProfile(stateWith(e)).result;
  assert.equal(result.followThroughRate, 94.34);
  assert.equal(Math.round(result.followThroughRate), 94);
  assert.equal(result.confidence, 'high');
 }
});
test('missing or mismatched evidence cannot support a commitment', () => {
 const state = stateWith({ ...original(), metadata: { ...original().metadata, commitmentId: 'wrong' } });
 assert.equal(reliabilityProfile(state).result.eligibleCommitments, 52);
 assert.equal(reliabilityProfile({ ...state, evidence: [] }).result.eligibleCommitments, 0);
});
test('provider reducer updates evidence immutably while preserving commitment history', () => {
 const state = { ...commitmentSeed, evidence: profileEvidence }, before = plain(state);
 const ctx = context('d');
 const next = applyCommitmentAction(state, { type: 'evidence', id: original().id, command: { action: 'disputed' }, context: ctx, at: ctx.at });
 assert.equal(next.commitments, state.commitments);
 assert.equal(next.evidence.length, state.evidence.length);
 assert.equal(reliabilityProfile(next).result.eligibleCommitments, 52);
 assert.deepEqual(plain(state), before);
});
test('private demo records remain owner-visible only across every workflow state', () => {
 const e = create('self-reported');
 for (const record of [e, svc.requestEvidenceVerification(e, context('p')), svc.verifyEvidence(e, external, context('v', '', external)), svc.disputeEvidence(e, context('d')), svc.revokeEvidence(e, context('r'))]) {
  assert.equal(canSeeEvidence(record, 'me', initialPermissions), true);
  for (const audience of ['public', 'friend', 'family', 'employer', 'landlord', 'neighbor']) assert.equal(canSeeEvidence(record, audience, initialPermissions), false);
 }
});
test('corrections and verification preserve existing selected-audience/category filtering', () => {
 const e = svc.correctEvidence(original(), { title: 'Corrected' }, context('c'));
 assert.deepEqual(plain(e.visibility), plain(original().visibility));
 assert.equal(canSeeEvidence(e, 'employer', initialPermissions), true);
 assert.equal(canSeeEvidence(e, 'neighbor', initialPermissions), false);
 const permissions = plain(initialPermissions); permissions.work.employer = false;
 assert.equal(canSeeEvidence(e, 'employer', permissions), false);
});
test('illustrative patterns drop excluded support and recover on resolution', () => {
 const e = create('self-reported');
 const pattern = { id: 'growth', title: 'Growth', value: 'Consistent', evidenceIds: [e.id], kinds: ['Self-reported'] };
 const d = svc.disputeEvidence(e, context('d'));
 const excluded = patternWithEvidence(pattern, [d]);
 assert.equal(excluded.value, 'No eligible evidence');
 assert.equal(excluded.evidenceIds.length, 0);
 assert.equal(patternWithEvidence(pattern, [svc.resolveEvidenceDispute(d, context('r'))]).evidenceIds.length, 1);
});
test('creation rejects invalid dates and mismatched provenance', () => {
 const input = plain(create('self-reported'));
 assert.throws(() => svc.createEvidence({ ...input, timestamp: '2026-02-30T00:00:00Z' }, context('bad-date')), /calendar/);
 assert.throws(() => svc.createEvidence({ ...input, provenance: 'external-source' }, context('bad-origin')), /origin/);
 assert.throws(() => svc.createEvidence({ ...input, timestamp: '2027-01-01T00:00:00Z' }, context('future')), /Occurrence/);
});
test('verified creation cannot attribute independent confirmation to the owner', () => {
 const input = plain(create('verified'));
 assert.throws(() => svc.createEvidence(input, context('owner-confirmation')), /external confirming source/);
});
test('correction, resolution and revocation require reasons without altering history', () => {
 const e = original(), before = plain(e);
 assert.throws(() => svc.correctEvidence(e, { title: 'Changed' }, context('c', '')), /reason/);
 assert.throws(() => svc.revokeEvidence(e, context('r', '')), /reason/);
 const d = svc.disputeEvidence(e, context('d'));
 assert.throws(() => svc.resolveEvidenceDispute(d, context('resolve', '')), /reason/);
 assert.deepEqual(plain(e), before);
});
