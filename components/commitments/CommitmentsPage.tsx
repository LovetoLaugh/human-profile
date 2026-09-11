'use client';
import { useState } from 'react';
import { Sidebar, TopBar } from '../Dashboard';
import { useCommitments } from './CommitmentProvider';
import { NewCommitmentForm } from './NewCommitmentForm';
import { CommitmentSummary } from './CommitmentSummary';
import { CommitmentListItem } from './CommitmentListItem';
import { ReliabilityEvidencePanel } from '../evidence/ReliabilityEvidencePanel';
import { EvidenceDetails } from '../profile/ProfileEvidence';
import type { EvidenceEvent } from '@/types/profile';
import { commitmentStatusLabels, type CommitmentStatus } from '@/domain/commitments/types';

export function CommitmentsPage() {
  const { state, dispatch, reliability } = useCommitments();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<CommitmentStatus | 'all'>('active');
  const [limit, setLimit] = useState(12);
  const [notice, setNotice] = useState('');
  const [showReliability, setShowReliability] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceEvent | null>(null);
  const filtered = state.commitments.filter(c => filter === 'all' || c.status === filter);
  function recordOutcome(type: 'complete' | 'miss' | 'cancel', id: string) {
    dispatch({ type, id, at: new Date().toISOString() });
    setNotice(type === 'cancel' ? 'Commitment cancelled. Its evidence is recorded and it is excluded from reliability.' : 'Outcome recorded as Observed evidence. Home and My Profile now reflect this outcome.');
  }
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to commitments</a><Sidebar/><div className="workspace"><TopBar label="Commitments"/>
    <main id="main-content"><div className="page-heading"><div><div className="eyebrow greeting-eyebrow">YOUR CHOICES, IN ACTION</div><h1>Commitments</h1><p>Things you&apos;ve chosen to follow through on.</p></div><button className="profile-button primary" onClick={() => setCreating(true)}>+ New Commitment</button></div>
      <CommitmentSummary result={reliability.result} onEvidence={() => setShowReliability(true)}/>
      <p className="profile-subtitle">Commitment → Outcome → Evidence → Pattern → Profile. Outcomes are recorded locally; no external verification is implied.</p>
      <div className="profile-filters" role="group" aria-label="Commitment status filter">{(['active', 'completed', 'completed-late', 'missed', 'cancelled', 'all'] as const).map(status => <button key={status} className={`profile-button ${filter === status ? 'primary' : ''}`} aria-pressed={filter === status} onClick={() => { setFilter(status); setLimit(12); }}>{status === 'all' ? 'All' : commitmentStatusLabels[status]} <span>({state.commitments.filter(c => status === 'all' || c.status === status).length})</span></button>)}</div>
      {notice && <p className="profile-notice" role="status">{notice}</p>}
      <section className="card commitment-page-list" aria-label="Commitments list">{filtered.slice(0, limit).map(commitment => <CommitmentListItem key={commitment.id} commitment={commitment} onAction={recordOutcome} onEvidence={() => setSelectedEvidence(state.evidence.find(e => commitment.evidenceIds.includes(e.id)) ?? null)}/>)}{filtered.length === 0 && <div className="empty-state"><h3>No {filter === 'all' ? '' : commitmentStatusLabels[filter].toLowerCase()} commitments</h3><p>New commitments start active. Record an outcome when you&apos;re ready.</p></div>}</section>
      {filtered.length > limit && <button className="profile-button load-more" onClick={() => setLimit(limit + 12)}>Show more commitments ({filtered.length - limit} remaining)</button>}
      <footer className="page-footer"><span>Cancelled and active commitments do not affect follow-through.</span><span>Sample history · Session changes reset on refresh</span></footer>
    </main></div>
    {creating && <NewCommitmentForm onClose={() => setCreating(false)} onSave={(input, id, at) => { dispatch({ type: 'create', input, id, at }); setCreating(false); setFilter('active'); setNotice('Commitment created. No outcome evidence is generated until it is resolved.'); }}/>} 
    {showReliability && <ReliabilityEvidencePanel visibleRecords={state.evidence} onClose={() => setShowReliability(false)}/>}
    {selectedEvidence && <EvidenceDetails event={selectedEvidence} onClose={() => setSelectedEvidence(null)}/>}
  </div>;
}
