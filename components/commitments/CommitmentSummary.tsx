import type { ReliabilityResult } from '@/domain/patterns/reliability';
export function CommitmentSummary({ result, onEvidence }: { result: ReliabilityResult; onEvidence: () => void }) {
  return <div className="commitment-summary-grid">
    {([['Active', result.active], ['Completed', result.completed], ['Completed Late', result.completedLate], ['Missed', result.missed]] as const).map(([label, count]) => <section className="card commitment-summary-card" key={label}><span>{label}</span><strong>{count}</strong><small>{label === 'Active' ? 'Ready for your next step' : 'Last 6 months'}</small></section>)}
    <section className="card commitment-summary-card followthrough-summary"><span>Follow-through</span><strong>{result.eligibleCommitments ? `${Math.round(result.followThroughRate)}%` : '—'}</strong><small>Based on {result.eligibleCommitments} observed commitments over the last 6 months.</small><button className="evidence-link" onClick={onEvidence}>View evidence →</button></section>
  </div>;
}
