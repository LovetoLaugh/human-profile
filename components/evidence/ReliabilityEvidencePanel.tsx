'use client';
import type { EvidenceEvent } from '@/types/profile';
import { useCommitments } from '../commitments/CommitmentProvider';
import { ProfileModal } from '../profile/ProfileModal';
import { CommitmentEvidenceRecord } from './CommitmentEvidenceRecord';

export function ReliabilityEvidencePanel({ visibleRecords, onClose, preview = false }: { visibleRecords: EvidenceEvent[]; onClose: () => void; preview?: boolean }) {
  const { reliability } = useCommitments();
  const { result, evidence } = reliability;
  const visibleIds = new Set(visibleRecords.map(e => e.id));
  const allowed = evidence.filter(e => visibleIds.has(e.id));
  return <ProfileModal title="Reliability — Last 6 months" onClose={onClose}>
    <div className="reliability-breakdown">
      <p><strong>{result.eligibleCommitments}</strong> commitments observed</p>
      <p><strong>{result.completed}</strong> completed on time</p>
      <p><strong>{result.completedLate}</strong> completed late</p>
      <p><strong>{result.missed}</strong> missed</p>
      <h3>Reliability: {result.eligibleCommitments ? `${Math.round(result.followThroughRate)}%` : 'Not enough data'}</h3>
    </div>
    <section className="profile-detail calculation-explanation"><h3>How this is calculated</h3>
      <p>Completed on time ÷ (completed on time + completed late + missed) × 100.</p>
      <p>{result.eligibleCommitments ? `${result.completed} ÷ ${result.eligibleCommitments} × 100 = ${result.followThroughRate.toFixed(2)}%, shown rounded to the nearest whole percent.` : 'No eligible observations yet. No rate is shown until an outcome is recorded.'}</p>
      <p>{result.cancelled} cancelled and {result.active} active commitments are excluded. Disputed, revoked, or missing supporting evidence is also excluded. With no due date, completion counts as on time.</p>
      <p>Confidence: <span className="capitalize">{result.confidence}</span>. 0–4 observations: Low; 5–19: Medium; 20+: High. This is an initial product rule based on sample size, not a scientific assessment.</p>
      <p>The window covers outcomes recorded in the last six calendar months through {formatAsOf(reliability.asOf)}. Late and missed outcomes remain in the denominator.</p>
      <p>This describes historical follow-through based on recorded commitments. It is not a judgment of character.</p>
      <p>{allowed.length} of {evidence.length} calculation records visible. Sharing a pattern does not automatically share its evidence. Observed actions are not independent verification.</p>
    </section>
    <div className="reliability-records">{allowed.map(event => <CommitmentEvidenceRecord key={event.id} event={event} showVisibility={!preview}/>)}{allowed.length === 0 && <p className="metric-explanation">No underlying records are included in this view.</p>}</div>
  </ProfileModal>;
}
function formatAsOf(value: string) { return `${value.slice(0, 10)} UTC`; }
