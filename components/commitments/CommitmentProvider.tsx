'use client';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { commitmentSeed } from '@/data/mocks/commitments';
import { profileEvidence } from '@/data/profile-details';
import { applyCommitmentAction, type CommitmentAction, type CommitmentState } from '@/domain/commitments/pipeline';
import { reliabilityProfile } from '@/domain/patterns/reliability-profile';

interface CommitmentContextValue {
  state: CommitmentState;
  reliability: ReturnType<typeof reliabilityProfile>;
  dispatch: (action: CommitmentAction) => void;
}
const CommitmentContext = createContext<CommitmentContextValue | null>(null);
const initialState: CommitmentState = { ...commitmentSeed, evidence: profileEvidence };

/** One session-wide source of truth, retained by the root layout during route changes. */
export function CommitmentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(applyCommitmentAction, initialState);
  useEffect(() => {
    const refresh = () => dispatch({ type: 'refresh-clock', at: new Date().toISOString() });
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const reliability = useMemo(() => reliabilityProfile(state), [state]);
  return <CommitmentContext.Provider value={{ state, dispatch, reliability }}>{children}</CommitmentContext.Provider>;
}
export function useCommitments() {
  const context = useContext(CommitmentContext);
  if (!context) throw new Error('CommitmentProvider is required.');
  return context;
}
