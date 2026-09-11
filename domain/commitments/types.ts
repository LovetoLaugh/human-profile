import type { AudienceType } from '../../types/profile';

export type CommitmentStatus = 'active' | 'completed' | 'completed-late' | 'missed' | 'cancelled';
export type CommitmentCategory = 'work' | 'personal' | 'family' | 'health' | 'learning' | 'community' | 'agreement';

export interface Commitment {
  id: string;
  title: string;
  description?: string;
  category: CommitmentCategory;
  createdAt: string;
  dueAt?: string;
  completedAt?: string;
  /** Time an outcome was recorded, including missed and cancelled outcomes. */
  resolvedAt?: string;
  status: CommitmentStatus;
  visibility: AudienceType[];
  evidenceIds: string[];
}

export interface NewCommitment {
  title: string;
  description?: string;
  category: CommitmentCategory;
  dueAt?: string;
  visibility: AudienceType[];
}

export const commitmentCategories: Record<CommitmentCategory, string> = {
  work: 'Work', personal: 'Personal', family: 'Family', health: 'Well-being',
  learning: 'Learning', community: 'Community', agreement: 'Agreement',
};
export const commitmentStatusLabels: Record<CommitmentStatus, string> = {
  active: 'Active', completed: 'Completed', 'completed-late': 'Completed Late', missed: 'Missed', cancelled: 'Cancelled',
};
