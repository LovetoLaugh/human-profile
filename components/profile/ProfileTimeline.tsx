import { timelineEvents, sourceLabels } from '@/data/profile-details';
import { commitmentSeed } from '@/data/mocks/commitments';
import type { EvidenceEvent, ProfileTimelineEvent } from '@/types/profile';
import { EvidenceBadge } from '../EvidenceBadge';
import { Icon } from '../Icon';
export function TimelineItem({ item, records, onSelect }: { item: ProfileTimelineEvent; records: EvidenceEvent[]; onSelect: (record: EvidenceEvent) => void }) {
 const sources = [...new Set(records.map(r => r.sourceType))];
 const dates = records.map(r => r.timestamp).sort();
 return <li className="profile-timeline-item"><span className="timeline-dot"><Icon name={records[0].icon} size={15}/></span><div><h3>{item.title}</h3><p>{[...new Set(records.map(r => r.category))].join(' · ')} · <time dateTime={dates[0]}>{dates[0].slice(0, 10)}{dates.length === 1 ? ` · ${dates[0].slice(11, 16)} UTC` : ` – ${dates[dates.length - 1].slice(0, 10)}`}</time></p><div className="pattern-badges">{sources.map(source => <EvidenceBadge key={source} kind={sourceLabels[source]}/>)}</div><p>{records.every(r => r.verificationStatus === 'verified') ? 'Confirmed in mock records' : records.some(r => r.verificationStatus === 'verified') ? 'Mixed verification · Some records unverified' : 'Not independently verified'}</p><div className="timeline-records">{records.map(r => <button key={r.id} className="evidence-link" onClick={() => onSelect(r)}>{records.length === 1 ? 'View evidence' : r.title}<Icon name="arrow" size={11}/></button>)}</div></div></li>;
}
export function ProfileTimeline({ records, onSelect }: { records: EvidenceEvent[]; onSelect: (record: EvidenceEvent) => void }) {
 // Omit aggregate events unless every linked record is permitted; titles must not leak hidden counts/categories.
 const seedIds = new Set(commitmentSeed.evidence.map(e => e.id));
 const updates: ProfileTimelineEvent[] = records.filter(e => e.type === 'commitment-outcome' && !seedIds.has(e.id)).map(e => ({id:e.id,title:`${e.title} — ${e.metadata?.outcome}`,group:'Recent updates',evidenceIds:[e.id]}));
 const visible = [...updates, ...timelineEvents].filter(t => t.evidenceIds.every(id => records.some(r => r.id === id)));
 return <section className="card sharing-summary"><div className="section-heading"><div><h2>Your evolving timeline</h2><p>New session outcomes and sample history from September 9, 2026</p></div><span className="period-pill">Mock timeline</span></div>{(['Recent updates', 'Today', 'This week', 'Last month'] as const).map(group => {
 const events = visible.filter(t => t.group === group);
 return events.length > 0 && <section key={group} className="timeline-group"><h3>{group}</h3><ol>{events.map(item => <TimelineItem key={item.id} item={item} records={records.filter(r => item.evidenceIds.includes(r.id))} onSelect={onSelect}/>)}</ol></section>;
 })}{visible.length === 0 && <p className="empty-state">No selected timeline events are shared with this audience.</p>}</section>;
}
