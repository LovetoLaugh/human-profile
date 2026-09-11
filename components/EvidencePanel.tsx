'use client';
import { patternWithEvidence } from '@/domain/patterns/evidence-profile';
import { useEffect, useRef } from 'react';
import { isShared } from '@/data/profile';
import type { BehavioralPattern, ProfilePerspective } from '@/types/profile';
import { EvidenceBadge } from './EvidenceBadge';
import { useCommitments } from './commitments/CommitmentProvider';
export function EvidencePanel({ pattern, perspective, onClose }: { pattern: BehavioralPattern; perspective: ProfilePerspective; onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const { state } = useCommitments();
 const current = patternWithEvidence(pattern, state.evidence);
 const records = state.evidence.filter(e => current.evidenceIds.includes(e.id));
 const sharedRecords = records.filter(e => isShared(e, perspective));
 useEffect(() => {
  const element = dialog.current;
  const previous = document.activeElement as HTMLElement | null;
  element?.showModal();
  return () => { element?.close(); previous?.focus(); };
 }, []);
 return <dialog ref={dialog} className="evidence-dialog" aria-labelledby="evidence-title" onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }}>
  <div className="evidence-dialog-content">
   <div className="panel-heading"><h2 id="evidence-title">{pattern.title} — {pattern.period}</h2><button autoFocus className="evidence-link" onClick={onClose}>Close</button></div>
   <p className="metric-explanation">Raw evidence → Observed patterns → Profile</p>
   <p className="metric-explanation">{perspective === 'Me' ? 'All linked evidence is shown below.' : 'The shared summary covers all commitments. Only evidence selected for this perspective is shown below; private record details are omitted.'} Sources, verification, and confidence are simulated.</p>
   <ul className="linked-evidence">{sharedRecords.map(e => <li key={e.id}><strong>{e.title}</strong><EvidenceBadge kind={e.kind}/><p>{e.category} · <time dateTime={e.timestamp}>{e.timestamp.slice(0, 10)}</time>{e.outcome && ` · ${e.outcome}`}</p><p>{e.source} · {e.verification}</p></li>)}</ul>
  </div>
 </dialog>;
}
