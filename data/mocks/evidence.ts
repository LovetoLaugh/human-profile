import { createEvidence, requestEvidenceVerification, disputeEvidence, revokeEvidence } from '../../domain/evidence/services';
import type { EvidenceContext, EvidenceType } from '../../domain/evidence/types';
const at = '2026-09-10T09:00:00.000Z';
const context = (id: string): EvidenceContext => ({ id, at, actor: { type: 'user', source: 'Owner (demo)', demo: true }, note: 'Demo workflow example; no external integration.' });
function demo(id: string, title: string, sourceType: EvidenceType) {
 return createEvidence({ id, title, sourceType, type: 'activity', description: `${title}. Deterministic demo data, not a real integration.`,
  provenance: sourceType === 'verified' ? 'external-source' : sourceType === 'observed' ? 'human-profile' : 'user',
  source: sourceType === 'verified' ? 'Reference provider (mock)' : sourceType === 'observed' ? 'Human Profile (demo)' : 'Owner (demo)',
  sourceId: sourceType === 'verified' ? 'mock-reference-1' : undefined,
  timestamp: at, category: title.startsWith('Fitness') ? 'Well-being' : sourceType === 'verified' ? 'References' : 'Learning', icon: 'book', relatedPattern: null, visibility: [], perspectives: [],
 }, { ...context(`created:${id}`), actor: { type: sourceType === 'verified' ? 'external-source' : sourceType === 'observed' ? 'human-profile' : 'user', source: sourceType === 'verified' ? 'Reference provider (mock)' : 'Demo fixture', sourceId: sourceType === 'verified' ? 'mock-reference-1' : undefined, demo: true } });
}
export const evidenceV2Demos = [
 demo('demo-self', 'Learning reflection', 'self-reported'),
 demo('demo-observed', 'Fitness attendance check-in recorded', 'observed'),
 requestEvidenceVerification(demo('demo-pending', 'Learning activity awaiting confirmation', 'self-reported'), context('pending:demo-pending')),
 demo('demo-verified', 'Reference confirmation (mock)', 'verified'),
 disputeEvidence(demo('demo-disputed', 'Fitness attendance date disputed', 'observed'), { ...context('disputed:demo-disputed'), note: 'Owner reports the attendance date is inaccurate (demo).' }),
 revokeEvidence(demo('demo-revoked', 'Duplicate learning activity withdrawn', 'self-reported'), { ...context('revoked:demo-revoked'), note: 'Duplicate record withdrawn (demo).' }),
];
