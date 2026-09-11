import { applyEvidenceCommand } from '../evidence/services';
import type { EvidenceCommand, EvidenceContext } from '../evidence/types';
import type { EvidenceEvent } from '../../types/profile';
import type { Commitment, NewCommitment } from './types';
import { createCommitment, completeCommitment, missCommitment, cancelCommitment, validInstant } from './service';

export interface CommitmentState { commitments: Commitment[]; evidence: EvidenceEvent[]; asOf: string }
export type CommitmentAction =
  | { type: 'evidence'; id: string; command: EvidenceCommand; context: EvidenceContext; at: string }
  | { type: 'create'; input: NewCommitment; id: string; at: string }
  | { type: 'complete' | 'miss' | 'cancel'; id: string; at: string }
  | { type: 'refresh-clock'; at: string };

/** Atomic local transaction: the outcome and its evidence are committed together. */
export function applyCommitmentAction(state: CommitmentState, action: CommitmentAction): CommitmentState {
  validInstant(action.at);
  const asOf = Date.parse(action.at) > Date.parse(state.asOf) ? action.at : state.asOf;
  if (action.type === 'evidence') {
    const current = state.evidence.find(e => e.id === action.id);
    if (!current) throw new Error('Evidence not found.');
    if (action.at !== action.context.at) throw new Error('Evidence clocks must match.');
    const updated = applyEvidenceCommand(current, action.command, action.context);
    return { ...state, asOf, evidence: state.evidence.map(e => e.id === action.id ? updated : e) };
  }
  if (action.type === 'refresh-clock') return { ...state, asOf };
  if (action.type === 'create') {
    if (state.commitments.some(c => c.id === action.id)) return state;
    const commitment = createCommitment(action.input, action.id, action.at);
    return { ...state, commitments: [commitment, ...state.commitments], asOf };
  }
  const current = state.commitments.find(c => c.id === action.id);
  if (!current) throw new Error('Commitment not found.');
  // Ignore repeated UI dispatches after resolution: no duplicate outcome evidence.
  if (current.status !== 'active') return state;
  const transition = action.type === 'complete' ? completeCommitment(current, action.at)
    : action.type === 'miss' ? missCommitment(current, action.at) : cancelCommitment(current, action.at);
  return {
    commitments: state.commitments.map(c => c.id === current.id ? transition.commitment : c),
    evidence: [transition.evidence, ...state.evidence], asOf,
  };
}
