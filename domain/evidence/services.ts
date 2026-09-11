import type { EvidenceActor, EvidenceCommand, EvidenceContext, EvidenceCorrection, EvidenceEvent, EvidenceInput, EvidenceType } from './types';
import { appendAudit, evidenceInstant, snapshot, validateContext } from './audit';

const labels = { 'self-reported': 'Self-reported', observed: 'Observed', verified: 'Verified' } as const;
function presentation(event: EvidenceEvent): EvidenceEvent {
 const status = event.verificationStatus;
 return { ...event, kind: labels[event.sourceType], verification: status === 'verified'
  ? `${event.verificationSource?.demo ? 'Mock confirmation' : 'Independent confirmation'} · ${event.verificationSource?.source}`
  : `${status[0].toUpperCase() + status.slice(1)} · Not currently independently verified` };
}
function external(source: EvidenceActor) {
 if (source.type !== 'external-source' || !source.source.trim() || !source.sourceId?.trim()) throw new Error('Independent external source and source ID are required.');
}
export function createEvidence(input: EvidenceInput, context: EvidenceContext): EvidenceEvent {
 validateContext(context);
 if (!input.id.trim() || !input.title.trim() || input.title.length > 160 || !input.description.trim() || input.description.length > 2000 || !input.source.trim()) throw new Error('Valid ID, title, description and source are required.');
 if (evidenceInstant(input.timestamp) > evidenceInstant(context.at)) throw new Error('Occurrence cannot follow creation.');
 const expected = { 'self-reported': 'user', observed: 'human-profile', verified: 'external-source' };
 if (input.provenance !== expected[input.sourceType]) throw new Error('Evidence type must match its origin.');
 if (input.visibility.some(a => !['public', 'friend', 'neighbor', 'employer', 'landlord', 'family'].includes(a))) throw new Error('Invalid audience.');
 const verificationSource = input.sourceType === 'verified' ? { type: 'external-source' as const, source: input.source, sourceId: input.sourceId, demo: context.actor.demo } : undefined;
 if (verificationSource) {
  external(verificationSource);
  if (context.actor.type !== 'external-source' || context.actor.source !== verificationSource.source || context.actor.sourceId !== verificationSource.sourceId) throw new Error('Verified creation must identify its external confirming source.');
 }
 const event = presentation({ ...input, visibility: [...input.visibility], perspectives: [...input.perspectives],
  ...(input.type === 'commitment-outcome' ? { metadata: { ...input.metadata } } : {}),
  createdAt: context.at, verificationStatus: verificationSource ? 'verified' : 'unverified', verificationSource,
  auditHistory: [], kind: labels[input.sourceType], verification: '' } as EvidenceEvent);
 return { ...event, auditHistory: [{ id: context.id, action: 'created', timestamp: context.at, actor: { ...context.actor }, note: context.note, next: snapshot(event) }] };
}
export function availableEvidenceActions(event: EvidenceEvent): EvidenceCommand['action'][] {
 if (event.verificationStatus === 'revoked') return [];
 if (event.verificationStatus === 'disputed') return ['corrected', 'dispute-resolved', 'revoked'];
 return [ ...(event.verificationStatus === 'unverified' && event.sourceType !== 'verified' ? ['verification-requested' as const] : []),
  ...(event.sourceType !== 'verified' && ['pending', 'unverified'].includes(event.verificationStatus) ? ['verified' as const] : []),
  'disputed', 'corrected', 'revoked' ];
}
export function contributesToPatterns(event: EvidenceEvent) {
 return event.verificationStatus !== 'revoked' && event.verificationStatus !== 'disputed';
}
export function applyEvidenceCommand(event: EvidenceEvent, command: EvidenceCommand, context: EvidenceContext): EvidenceEvent {
 validateContext(context, event);
 if (!availableEvidenceActions(event).includes(command.action)) throw new Error('This evidence action is not allowed in the current state.');
 if (['disputed', 'dispute-resolved', 'corrected', 'revoked'].includes(command.action) && !context.note?.trim()) throw new Error('A reason is required.');
 let next = { ...event };
 switch (command.action) {
  case 'verification-requested': next.verificationStatus = 'pending'; break;
  case 'verified':
   external(command.source);
   if (context.actor.type !== 'external-source' || context.actor.sourceId !== command.source.sourceId || context.actor.source !== command.source.source) throw new Error('Verification must be attributed to the confirming external source.');
   next = { ...next, sourceType: 'verified', verificationStatus: 'verified', verificationSource: { ...command.source } }; break;
  case 'disputed': next.verificationStatus = 'disputed'; break;
  case 'dispute-resolved': {
   const index = event.auditHistory.map(a => a.action).lastIndexOf('disputed');
   const prior = event.auditHistory[index]?.previous;
   if (!prior) throw new Error('Missing dispute history.');
   const corrected = event.auditHistory.slice(index + 1).some(a => a.action === 'corrected');
   next.verificationStatus = corrected ? 'unverified' : prior.verificationStatus;
   break;
  }
  case 'corrected': {
   if (Object.keys(command.changes).some(k => !['title', 'description'].includes(k))) throw new Error('Only title and description can be corrected; outcome revisions require a separate commitment revision.');
   const title = command.changes.title?.trim() ?? event.title;
   const description = command.changes.description?.trim() ?? event.description;
   if (!title || title.length > 160 || !description || description.length > 2000) throw new Error('A title (1–160) and description (1–2000 characters) are required.');
   if (title === event.title && description === event.description) throw new Error('Correction must change the record.');
   const origin = event.auditHistory[0].next.sourceType;
   const sourceType: EvidenceType = origin === 'verified' ? 'self-reported' : origin;
   next = { ...next, title, description, sourceType, verificationSource: undefined,
    verificationStatus: event.verificationStatus === 'disputed' ? 'disputed' : 'unverified' }; break;
  }
  case 'revoked': next.verificationStatus = 'revoked'; break;
 }
 return appendAudit(event, presentation(next), command.action, context);
}
export const requestEvidenceVerification = (e: EvidenceEvent, c: EvidenceContext) => applyEvidenceCommand(e, { action: 'verification-requested' }, c);
export const verifyEvidence = (e: EvidenceEvent, source: EvidenceActor, c: EvidenceContext) => applyEvidenceCommand(e, { action: 'verified', source }, c);
export const disputeEvidence = (e: EvidenceEvent, c: EvidenceContext) => applyEvidenceCommand(e, { action: 'disputed' }, c);
export const resolveEvidenceDispute = (e: EvidenceEvent, c: EvidenceContext) => applyEvidenceCommand(e, { action: 'dispute-resolved' }, c);
export const correctEvidence = (e: EvidenceEvent, changes: EvidenceCorrection, c: EvidenceContext) => applyEvidenceCommand(e, { action: 'corrected', changes }, c);
export const revokeEvidence = (e: EvidenceEvent, c: EvidenceContext) => applyEvidenceCommand(e, { action: 'revoked' }, c);
