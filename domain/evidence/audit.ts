import type { EvidenceAuditAction, EvidenceContext, EvidenceEvent, EvidenceSnapshot } from './types';

export function evidenceInstant(value: string) {
 const time = Date.parse(value);
 if (!Number.isFinite(time) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error('A valid timestamp with timezone is required.');
 const date = value.slice(0, 10);
 if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Invalid calendar date.');
 return time;
}
export function validateContext(context: EvidenceContext, event?: EvidenceEvent) {
 const time = evidenceInstant(context.at);
 if (!context.id.trim() || !context.actor.source.trim() || !['user', 'human-profile', 'external-source'].includes(context.actor.type)) throw new Error('Audit ID and actor/source are required.');
 if (event) {
  if (event.auditHistory.some(a => a.id === context.id)) throw new Error('Duplicate audit ID.');
  if (time < evidenceInstant(event.auditHistory.at(-1)!.timestamp)) throw new Error('Audit entries must be chronological.');
 }
}
export function snapshot(event: EvidenceSnapshot): EvidenceSnapshot {
 return { title: event.title, description: event.description, sourceType: event.sourceType,
  verificationStatus: event.verificationStatus, verificationSource: event.verificationSource ? { ...event.verificationSource } : undefined };
}
export function appendAudit(previous: EvidenceEvent, next: EvidenceEvent, action: EvidenceAuditAction, context: EvidenceContext): EvidenceEvent {
 validateContext(context, previous);
 return { ...next, auditHistory: [...previous.auditHistory, { id: context.id, action, timestamp: context.at,
  actor: { ...context.actor }, note: context.note?.trim(), previous: snapshot(previous), next: snapshot(next) }] };
}
