import type { AudienceType, EvidenceEvent } from '../../types/profile';
import { createOutcomeEvidence } from '../evidence/commitment-outcome';
import { commitmentCategories, type Commitment, type NewCommitment } from './types';

const audiences: AudienceType[] = ['public', 'friend', 'neighbor', 'employer', 'landlord', 'family'];
export function validInstant(value: string): number {
  const timestamp = Date.parse(value);
  const parts = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  const [year, month, day] = parts ? parts.slice(1).map(Number) : [0, 0, 0];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!parts || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new Error('Use a valid timestamp date.');
  if (!Number.isFinite(timestamp) || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Use a valid timestamp with a timezone.');
  }
  return timestamp;
}

export function createCommitment(input: NewCommitment, id: string, createdAt: string): Commitment {
  const title = input.title.trim();
  if (!id || !title || title.length > 160) throw new Error('A title of 1–160 characters is required.');
  if ((input.description?.length ?? 0) > 2000) throw new Error('Description must be 2,000 characters or fewer.');
  if (!Object.prototype.hasOwnProperty.call(commitmentCategories, input.category)) throw new Error('Choose a valid category.');
  if (input.visibility.some(a => !audiences.includes(a))) throw new Error('Choose a valid audience.');
  validInstant(createdAt);
  if (input.dueAt) validInstant(input.dueAt);
  return { id, title, description: input.description?.trim() || undefined, category: input.category,
    createdAt, dueAt: input.dueAt, status: 'active', visibility: [...new Set(input.visibility)], evidenceIds: [] };
}

export interface CommitmentTransition { commitment: Commitment; evidence: EvidenceEvent }
function resolveCommitment(commitment: Commitment, status: 'completed' | 'missed' | 'cancelled', at: string): CommitmentTransition {
  if (commitment.status !== 'active') throw new Error('This commitment already has an outcome.');
  const recordedTime = validInstant(at);
  if (recordedTime < validInstant(commitment.createdAt)) throw new Error('An outcome cannot precede creation.');
  const completedLate = status === 'completed' && commitment.dueAt !== undefined && recordedTime > validInstant(commitment.dueAt);
  const updated: Commitment = {
    ...commitment, status: completedLate ? 'completed-late' : status,
    completedAt: status === 'completed' ? at : undefined, resolvedAt: at,
    visibility: [...commitment.visibility], evidenceIds: [...commitment.evidenceIds],
  };
  const evidence = createOutcomeEvidence(updated);
  updated.evidenceIds.push(evidence.id);
  return { commitment: updated, evidence };
}

/** Equality with the deadline is on time. With no deadline, completion is on time. */
export const completeCommitment = (commitment: Commitment, completedAt: string) => resolveCommitment(commitment, 'completed', completedAt);
export const missCommitment = (commitment: Commitment, recordedAt: string) => resolveCommitment(commitment, 'missed', recordedAt);
export const cancelCommitment = (commitment: Commitment, recordedAt: string) => resolveCommitment(commitment, 'cancelled', recordedAt);

/** Date-only deadlines mean the end of that calendar day in the creator's local timezone. */
export function deadlineFromLocalDate(date: string): string | undefined {
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid due date.');
  const [year, month, day] = date.split('-').map(Number);
  const deadline = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (deadline.getFullYear() !== year || deadline.getMonth() !== month - 1 || deadline.getDate() !== day) throw new Error('Choose a valid due date.');
  return deadline.toISOString();
}
