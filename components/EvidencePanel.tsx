'use client';
import { useEffect, useRef } from 'react';
import { evidence, isShared, reliabilitySummary } from '@/data/profile';
import type { BehavioralPattern, ProfilePerspective } from '@/types/profile';
import { EvidenceBadge } from './EvidenceBadge';
export function EvidencePanel({ pattern, perspective, onClose }: { pattern: BehavioralPattern; perspective: ProfilePerspective; onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const records = evidence.filter(e => pattern.evidenceIds.includes(e.id));
 const sharedRecords = records.filter(e => isShared(e, perspective));
 const summary = reliabilitySummary(records);
 useEffect(() => {
  const element = dialog.current;
  const previous = document.activeElement as HTMLElement | null;
  element?.showModal();
  return () => { element?.close(); previous?.focus(); };
 }, []);
 return <dialog ref={dialog} className="evidence-dialog" aria-labelledby="evidence-title" onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }}>
  <div className="evidence-dialog-content">
   <div className="panel-heading"><h2 id="evidence-title">{pattern.title} — {pattern.period}</h2><button autoFocus className="evidence-link" onClick={onClose}>Close</button></div>
   {pattern.id === 'reliability' && <><div className="reliability-breakdown"><p><strong>{summary.observed}</strong> commitments observed</p><p><strong>{summary.completed}</strong> completed</p><p><strong>{summary.late}</strong> completed late</p><p><strong>{summary.missed}</strong> missed</p><h3>Reliability: {summary.percentage}%</h3><p>Completed means completed on time. {summary.completed} ÷ {summary.observed}, rounded to the nearest percent; late completions are counted separately.</p></div><p className="metric-explanation">This metric describes historical follow-through.<br/>It is not a judgment of character.</p></>}
   <p className="metric-explanation">Raw evidence → Observed patterns → Profile</p>
   <p className="metric-explanation">{perspective === 'Me' ? 'All linked evidence is shown below.' : 'The shared summary covers all commitments. Only evidence selected for this perspective is shown below; private record details are omitted.'} Sources, verification, and confidence are simulated.</p>
   <ul className="linked-evidence">{sharedRecords.map(e => <li key={e.id}><strong>{e.title}</strong><EvidenceBadge kind={e.kind}/><p>{e.category} · <time dateTime={e.timestamp}>{e.timestamp.slice(0, 10)}</time>{e.outcome && ` · ${e.outcome}`}</p><p>{e.source} · {e.verification}</p></li>)}</ul>
  </div>
 </dialog>;
}
