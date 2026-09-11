import type { AudienceType, EvidenceKind, EvidenceSourceType, PatternId, ProfilePerspective } from '../../types/profile';
import type { CommitmentOutcomeMetadata } from './commitment-outcome';

interface EvidenceBase {
 description: string;
 sourceType: EvidenceSourceType;
 verificationStatus: 'mock-verified' | 'unverified' | 'recorded';
 relatedPattern: PatternId | null;
 visibility: AudienceType[];
 id: string;
 title: string;
 timestamp: string;
 category: string;
 source: string;
 kind: EvidenceKind;
 verification: string;
 icon: string;
 perspectives: ProfilePerspective[];
 pattern?: PatternId;
 outcome?: 'completed' | 'late' | 'missed' | 'cancelled';
}

export interface ActivityEvidence extends EvidenceBase {
 type: 'activity';
 metadata?: never;
}
export interface CommitmentOutcomeEvidence extends EvidenceBase {
 type: 'commitment-outcome';
 metadata: CommitmentOutcomeMetadata;
}
export type EvidenceEvent = ActivityEvidence | CommitmentOutcomeEvidence;
