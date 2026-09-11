import type { EvidenceEvent } from '@/types/profile';
import { commitmentStatusLabels } from '@/domain/commitments/types';
import { EvidenceBadge } from '../EvidenceBadge';

export function formatEvidenceDate(value?: string) {
  return value ? `${value.slice(0, 10)} · ${value.slice(11, 16)} UTC` : 'Not set';
}
export function CommitmentEvidenceRecord({ event, showVisibility = true }: { event: EvidenceEvent; showVisibility?: boolean }) {
  const metadata = event.metadata;
  if (!metadata) return null;
  return <article className="commitment-evidence-record">
    <div className="evidence-card-heading"><strong>{event.title}</strong><EvidenceBadge kind={event.kind}/></div>
    <dl>
      <dt>Expected date</dt><dd>{formatEvidenceDate(metadata.expectedAt)}</dd>
      <dt>Outcome</dt><dd>{commitmentStatusLabels[metadata.outcome]}</dd>
      <dt>Completion date</dt><dd>{metadata.completedAt ? formatEvidenceDate(metadata.completedAt) : 'Not completed'}</dd>
      <dt>Recorded</dt><dd>{formatEvidenceDate(event.timestamp)}</dd>
      <dt>Evidence source</dt><dd>{event.source}</dd>
      <dt>Verification</dt><dd>{event.verification}</dd>
      <dt>Visibility</dt><dd>{showVisibility ? event.visibility.length ? event.visibility.join(', ') : 'Me only' : 'Included in this audience preview'}</dd>
    </dl>
  </article>;
}
