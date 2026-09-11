'use client';
import { useState } from 'react';
import type { EvidenceEvent, EvidenceSourceType } from '@/types/profile';
import { evidenceCounts, sourceLabels } from '@/data/profile-details';
import { EvidenceBadge } from '../EvidenceBadge';
import { Icon } from '../Icon';
import { ProfileModal } from './ProfileModal';
import { CommitmentEvidenceRecord } from '../evidence/CommitmentEvidenceRecord';
export function EvidenceSummary({ records, onViewAll }: { records: EvidenceEvent[]; onViewAll: () => void }) {
 const counts = evidenceCounts(records);
 return <section className="card sharing-summary evidence-summary"><h2>Evidence Behind Your Profile</h2><div className="evidence-counts">{(Object.keys(sourceLabels) as EvidenceSourceType[]).map(type => <div key={type}><EvidenceBadge kind={sourceLabels[type]}/><strong>{counts[type]}</strong></div>)}</div><div className="summary-total"><span>Total</span><strong>{counts.total}</strong></div><p>Metrics are derived from evidence you can inspect.</p><button className="evidence-link" onClick={onViewAll}>View all evidence <Icon name="arrow" size={13}/></button><small>Sample records + locally observed outcomes.</small></section>;
}
export function EvidenceCard({ event, onSelect }: { event: EvidenceEvent; onSelect: () => void }) {
 return <button className="card profile-evidence-card" onClick={onSelect} aria-label={`View details: ${event.title}`}><div className="evidence-card-heading"><span className="pattern-icon green"><Icon name={event.icon} size={17}/></span><strong>{event.title}</strong><EvidenceBadge kind={sourceLabels[event.sourceType]}/></div><div className="evidence-card-meta"><span>{event.category}</span><time dateTime={event.timestamp}>{event.timestamp.slice(0, 10)} · {event.timestamp.slice(11, 16)} UTC</time></div><p>Source: {event.source}</p><p>Verification: {event.verification}</p><div className="evidence-card-footer"><span>Related pattern: {event.relatedPattern ?? 'None'}</span><Icon name="chevron" size={13}/></div></button>;
}
export function EvidenceBrowser({ records, onSelect }: { records: EvidenceEvent[]; onSelect: (event: EvidenceEvent) => void }) {
 const [filter, setFilter] = useState<EvidenceSourceType | 'all'>('all');
 const [limit, setLimit] = useState(12);
 const filtered = records.filter(e => filter === 'all' || e.sourceType === filter);
 return <section><div className="section-heading"><div><h2>Profile evidence</h2><p>Inspect the information behind your profile. Recorded actions are observed, not independently verified.</p></div><span className="period-pill">{filtered.length} items</span></div><div className="profile-filters" role="group" aria-label="Evidence source filter">{(['all', ...Object.keys(sourceLabels)] as ('all' | EvidenceSourceType)[]).map(type => <button key={type} className={`profile-button ${filter === type ? 'primary' : ''}`} aria-pressed={filter === type} onClick={() => { setFilter(type); setLimit(12); }}>{type === 'all' ? 'All' : sourceLabels[type]}</button>)}</div><div className="profile-evidence-grid">{filtered.slice(0, limit).map(event => <EvidenceCard key={event.id} event={event} onSelect={() => onSelect(event)}/>)}</div>{filtered.length === 0 && <p className="card empty-state">No evidence is included for this source and audience.</p>}{filtered.length > limit && <button className="profile-button load-more" onClick={() => setLimit(limit + 12)}>Show more evidence ({filtered.length - limit} remaining)</button>}</section>;
}
export function EvidenceDetails({ event, onClose, preview = false }: { event: EvidenceEvent; onClose: () => void; preview?: boolean }) {
 if (event.type === 'commitment-outcome') {
  return <ProfileModal title={event.title} onClose={onClose}><div className="profile-detail">
   <CommitmentEvidenceRecord event={event} showVisibility={!preview}/>
   <p>{event.description}</p><p>Category: {event.category} · Related pattern: {event.relatedPattern} · Record: {event.id}</p>
  </div></ProfileModal>;
 }
 return <ProfileModal title={event.title} onClose={onClose}><div className="profile-detail"><EvidenceBadge kind={sourceLabels[event.sourceType]}/><p>{event.description}</p><dl><dt>Category</dt><dd>{event.category}</dd><dt>Timestamp</dt><dd><time dateTime={event.timestamp}>{event.timestamp.slice(0, 10)} · {event.timestamp.slice(11, 16)} UTC</time></dd><dt>Source</dt><dd>{event.source}</dd><dt>Verification</dt><dd>{event.verification}</dd><dt>Related pattern</dt><dd>{event.relatedPattern ?? 'None'}</dd><dt>Record ID</dt><dd>{event.id}</dd></dl><p>Verification labels describe mock provenance, not real-world verification. This evidence provides context; it does not establish character.</p></div></ProfileModal>;
}
