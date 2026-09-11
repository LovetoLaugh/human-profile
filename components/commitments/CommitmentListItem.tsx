import type { Commitment } from '@/domain/commitments/types';
import { commitmentCategories, commitmentStatusLabels } from '@/domain/commitments/types';
import { formatEvidenceDate } from '../evidence/CommitmentEvidenceRecord';
import { Icon } from '../Icon';
export function CommitmentListItem({ commitment, onAction, onEvidence }: { commitment: Commitment; onAction: (type: 'complete' | 'miss' | 'cancel', id: string) => void; onEvidence: () => void }) {
  return <article className="commitment-list-item">
    <span className={`pattern-icon ${commitment.status === 'missed' ? 'amber' : 'green'}`}><Icon name={commitment.status === 'active' ? 'focus' : 'check'} size={18}/></span>
    <div className="commitment-item-body"><div className="commitment-item-heading"><h3>{commitment.title}</h3><span className={`commitment-status status-${commitment.status}`}>{commitmentStatusLabels[commitment.status]}</span></div>
      {commitment.description && <p>{commitment.description}</p>}
      <div className="commitment-item-meta"><span>{commitmentCategories[commitment.category]}</span><span>Due: {formatEvidenceDate(commitment.dueAt)}</span><span>Visibility: {commitment.visibility.length ? commitment.visibility.join(', ') : 'Me only'}</span></div>
      {commitment.completedAt && <p className="commitment-item-meta">Completed: {formatEvidenceDate(commitment.completedAt)}</p>}
      <div className="profile-actions">{commitment.status === 'active' ? <>
        <button className="profile-button primary" onClick={() => onAction('complete', commitment.id)}>Mark Complete</button>
        <button className="profile-button" onClick={() => onAction('miss', commitment.id)}>Mark Missed</button>
        <button className="profile-button" onClick={() => onAction('cancel', commitment.id)}>Cancel</button>
      </> : <button className="evidence-link" onClick={onEvidence}>View evidence <Icon name="arrow" size={12}/></button>}</div>
    </div>
  </article>;
}
