import type { Commitment } from '../commitments/types';
import { validInstant } from '../commitments/service';

export type ReliabilityConfidence = 'low' | 'medium' | 'high';
export interface ReliabilityResult {
  eligibleCommitments: number;
  completed: number;
  completedLate: number;
  missed: number;
  cancelled: number;
  active: number;
  followThroughRate: number;
  confidence: ReliabilityConfidence;
  eligibleCommitmentIds: string[];
}

export function calculateReliability(commitments: readonly Commitment[]): ReliabilityResult {
  // IDs represent observations, so duplicate objects must never inflate counts.
  const unique = [...new Map(commitments.map(c => [c.id, c])).values()];
  const count = (status: Commitment['status']) => unique.filter(c => c.status === status).length;
  const completed = count('completed');
  const completedLate = count('completed-late');
  const missed = count('missed');
  const eligibleCommitments = completed + completedLate + missed;
  // Initial transparent product rule based solely on sample size, not a scientific assessment.
  const confidence = eligibleCommitments < 5 ? 'low' : eligibleCommitments < 20 ? 'medium' : 'high';
  return {
    eligibleCommitments, completed, completedLate, missed, cancelled: count('cancelled'), active: count('active'),
    followThroughRate: eligibleCommitments ? Math.round(completed / eligibleCommitments * 10000) / 100 : 0,
    confidence,
    eligibleCommitmentIds: unique.filter(c => ['completed', 'completed-late', 'missed'].includes(c.status)).map(c => c.id),
  };
}

/** The profile window uses when an outcome was recorded, not when an item was created. */
export function commitmentsInWindow(commitments: readonly Commitment[], asOf: string, months = 6): Commitment[] {
  const end = validInstant(asOf);
  const start = new Date(end);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  return commitments.filter(c => {
    if (c.status === 'active') return validInstant(c.createdAt) <= end;
    const observedAt = c.resolvedAt ?? c.completedAt;
    return observedAt !== undefined && validInstant(observedAt) >= start.getTime() && validInstant(observedAt) <= end;
  });
}
