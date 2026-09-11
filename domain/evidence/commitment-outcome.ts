import { createEvidence } from './services';
import type { Commitment, CommitmentStatus } from '../commitments/types';
import { commitmentCategories } from '../commitments/types';
import type { EvidenceEvent, ProfilePerspective } from '../../types/profile';

export interface CommitmentOutcomeMetadata {
  commitmentId: string;
  expectedAt?: string;
  completedAt?: string;
  outcome: Exclude<CommitmentStatus, 'active'>;
}

/** The app records a transition. It does not independently verify that work occurred. */
export function createOutcomeEvidence(commitment: Commitment): EvidenceEvent {
  if (commitment.status === 'active' || !commitment.resolvedAt) {
    throw new Error('Only a resolved commitment can produce outcome evidence.');
  }
  return createEvidence({
    id: `outcome:${commitment.id}`,
    type: 'commitment-outcome',
    title: commitment.title,
    description: `Human Profile recorded this commitment as ${commitment.status}. This action is not independent confirmation.`,
    category: commitmentCategories[commitment.category],
    timestamp: commitment.resolvedAt,
    sourceType: 'observed',
    provenance: 'human-profile',
    relatedEntityType: 'commitment', relatedEntityId: commitment.id,
    relatedPattern: 'reliability',
    metadata: {
      commitmentId: commitment.id, expectedAt: commitment.dueAt,
      completedAt: commitment.completedAt, outcome: commitment.status,
    },
    visibility: [...commitment.visibility],
    source: 'Human Profile · Recorded status transition',
    // Compatibility presentation fields for the existing profile/evidence components.
    icon: 'check',
    pattern: 'reliability',
    outcome: commitment.status === 'completed-late' ? 'late' : commitment.status,
    perspectives: commitment.visibility.filter(a => a !== 'public').map(a => (a[0].toUpperCase() + a.slice(1)) as ProfilePerspective),
  }, { id: `created:outcome:${commitment.id}`, at: commitment.resolvedAt, actor: { type: 'human-profile', source: 'Human Profile' } });
}
