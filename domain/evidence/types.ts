import type { AudienceType, EvidenceKind, PatternId, ProfilePerspective } from '../../types/profile';
import type { CommitmentOutcomeMetadata } from './commitment-outcome';

export type EvidenceType = 'self-reported' | 'observed' | 'verified';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'disputed' | 'revoked';
export type ProvenanceType = 'user' | 'human-profile' | 'external-source';
export interface EvidenceActor { type: ProvenanceType; source: string; sourceId?: string; demo?: boolean }
export type EvidenceAuditAction = 'created' | 'verification-requested' | 'verified' | 'disputed' | 'dispute-resolved' | 'corrected' | 'revoked';
export interface EvidenceSnapshot {
 title: string;
 description: string;
 sourceType: EvidenceType;
 verificationStatus: VerificationStatus;
 verificationSource?: EvidenceActor;
}
export interface EvidenceAuditEntry {
 id: string;
 action: EvidenceAuditAction;
 timestamp: string;
 actor: EvidenceActor;
 note?: string;
 previous?: EvidenceSnapshot;
 next: EvidenceSnapshot;
}
export interface EvidenceContext { id: string; at: string; actor: EvidenceActor; note?: string }
interface EvidenceBase extends EvidenceSnapshot {
 // sourceType is the evidence classification; type below discriminates the payload.
 provenance: ProvenanceType;
 source: string;
 sourceId?: string;
 createdAt: string;
 // Existing timestamp is the occurrence time (occurredAt), not the audit clock.
 timestamp: string;
 confidence?: 'Low' | 'Medium' | 'High';
 relatedEntityType?: string;
 relatedEntityId?: string;
 auditHistory: readonly EvidenceAuditEntry[];
 relatedPattern: PatternId | null;
 visibility: AudienceType[];
 id: string;
 category: string;
 // Compatibility presentation fields, synchronized by the domain service.
 kind: EvidenceKind;
 verification: string;
 icon: string;
 perspectives: ProfilePerspective[];
 pattern?: PatternId;
 outcome?: 'completed' | 'late' | 'missed' | 'cancelled';
}
export interface ActivityEvidence extends EvidenceBase { type: 'activity'; metadata?: never }
export interface CommitmentOutcomeEvidence extends EvidenceBase { type: 'commitment-outcome'; metadata: CommitmentOutcomeMetadata }
export type EvidenceEvent = ActivityEvidence | CommitmentOutcomeEvidence;
export type EvidenceInput = EvidenceEvent extends infer E ? E extends EvidenceEvent ? Omit<E, 'createdAt' | 'auditHistory' | 'kind' | 'verification' | 'verificationStatus' | 'verificationSource'> : never : never;
export type EvidenceCorrection = Partial<Pick<EvidenceSnapshot, 'title' | 'description'>>;
export type EvidenceCommand =
 | { action: 'verification-requested' | 'disputed' | 'dispute-resolved' | 'revoked' }
 | { action: 'verified'; source: EvidenceActor }
 | { action: 'corrected'; changes: EvidenceCorrection };
