import type { BehavioralPattern } from '../../types/profile';
import type { CommitmentState } from '../commitments/pipeline';
import { calculateReliability, commitmentsInWindow } from './reliability';

/** One read model supplies cards, summaries, and the evidence panel on every route. */
export function reliabilityProfile(state: CommitmentState) {
  const window = commitmentsInWindow(state.commitments, state.asOf);
  const result = calculateReliability(window);
  const eligible = new Set(result.eligibleCommitmentIds);
  const commitments = window.filter(c => eligible.has(c.id));
  const linkedIds = new Set(commitments.flatMap(c => c.evidenceIds));
  const evidence = state.evidence.filter(e => linkedIds.has(e.id));
  const confidence = (result.confidence[0].toUpperCase() + result.confidence.slice(1)) as 'Low' | 'Medium' | 'High';
  const pattern: BehavioralPattern = {
    id: 'reliability', title: 'Reliability', value: result.eligibleCommitments ? `${Math.round(result.followThroughRate)}%` : 'Not enough data',
    detail: `${result.eligibleCommitments} commitments observed`,
    observations: `${result.completed} completed on time · ${result.completedLate} completed late · ${result.missed} missed`,
    period: 'Last 6 months', icon: 'shield', color: 'green', confidence,
    evidenceIds: evidence.map(e => e.id), kinds: [...new Set(evidence.map(e => e.kind))],
    perspectives: ['Employer', 'Landlord', 'Neighbor'],
  };
  return { result, commitments, evidence, pattern, asOf: state.asOf };
}
