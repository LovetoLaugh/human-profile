import { patternWithEvidence } from '@/domain/patterns/evidence-profile';
import type { BehavioralPattern, EvidenceEvent, ProfileSection } from '@/types/profile';
import { profilePatterns, profileWellbeing, patternSections, sourceLabels, profileContext } from '@/data/profile-details';
import { useCommitments } from '../commitments/CommitmentProvider';
import { CurrentStateCard, TrendMiniChart, BehavioralPatternCard } from '../Dashboard';
import { EvidenceBadge } from '../EvidenceBadge';
import { Icon } from '../Icon';
import { EvidenceCard, EvidenceSummary } from './ProfileEvidence';
import { ProfileModal } from './ProfileModal';
export function WellbeingCard({ metric }: { metric: typeof profileWellbeing[number] }) {
 return <article className="card wellbeing-card"><div className="metric-label"><span className={`metric-icon ${metric.color}`}><Icon name={metric.icon} size={17}/></span>{metric.label}<span className="mini-period">7d</span></div><div className="wellbeing-value">{metric.value}<small>{metric.unit}</small></div><TrendMiniChart values={metric.values} color={metric.color}/><div className="metric-change">{metric.change}</div><EvidenceBadge kind={sourceLabels[metric.sourceType]}/></article>;
}
export function PatternCard({ pattern, onEvidence }: { pattern: BehavioralPattern; onEvidence: () => void }) {
 return <div className={pattern.id === 'financial' ? 'financial-pattern' : undefined}><BehavioralPatternCard pattern={pattern} onEvidence={onEvidence}/></div>;
}
export function ProfileOverview({ canSee, records, onPattern, onEvidence, onViewAll }: { canSee: (section: ProfileSection) => boolean; records: EvidenceEvent[]; onPattern: (pattern: BehavioralPattern) => void; onEvidence: (event: EvidenceEvent) => void; onViewAll: () => void }) {
 const { reliability, state } = useCommitments();
 const visiblePatterns = [reliability.pattern, ...profilePatterns.map(p => patternWithEvidence(p, state.evidence))].filter(p => canSee(patternSections[p.id]));
 return <div className="dashboard-grid"><div className="main-column">
  {canSee('current-state') && <CurrentStateCard/>}
  {canSee('wellbeing') && <section><div className="section-heading"><div><h2>Well-being</h2><p>Lightweight context from your last 7 days · Mock trends</p></div></div><div className="wellbeing-grid profile-wellbeing">{profileWellbeing.map(metric => <WellbeingCard key={metric.label} metric={metric}/>)}</div></section>}
  {visiblePatterns.length > 0 && <section><div className="section-heading"><div><h2>Patterns Over Time</h2><p>Patterns based on your activity and evidence — not judgments.</p></div><span className="period-pill">Derived patterns</span></div><div className="patterns-grid">{visiblePatterns.map(pattern => <PatternCard key={pattern.id} pattern={pattern} onEvidence={() => onPattern(pattern)}/>)}</div><p className="profile-subtitle">Source badges describe the underlying evidence. Pattern labels and confidence are illustrative interpretations; Financial Responsibility is a personal reflection.</p></section>}
  {canSee('work') && <section className="card sharing-summary"><h2>Work History</h2><p>{profileContext.work}</p><EvidenceBadge kind="Self-reported"/></section>}
  {canSee('family') && <section className="card sharing-summary"><h2>Family connection</h2><p>{profileContext.family}</p><EvidenceBadge kind="Self-reported"/></section>}
  {canSee('references') && <section className="card sharing-summary"><h2>References</h2><p>{profileContext.reference}</p><EvidenceBadge kind="Verified"/><p>{profileContext.referenceSource}</p></section>}
  {!visiblePatterns.length && !canSee('current-state') && !canSee('wellbeing') && <section className="card sharing-summary"><h2>A deliberately limited view</h2><p>Explore the About tab for the information included in this audience’s profile.</p></section>}
  <div className="context-note"><Icon name="shield" size={18}/><p><strong>Raw evidence → Observed patterns → Profile.</strong> Every pattern links to inspectable records. Observations provide context, not a verdict.</p></div>
 </div><aside className="right-column"><EvidenceSummary records={records} onViewAll={onViewAll}/>{records.length > 0 && <section><div className="section-heading"><h2>Recent evidence</h2></div><div className="profile-recent-evidence">{records.slice(0, 3).map(event => <EvidenceCard key={event.id} event={event} onSelect={() => onEvidence(event)}/>)}</div></section>}</aside></div>;
}
export function PatternDetails({ pattern, allRecords, visibleRecords, onClose }: { pattern: BehavioralPattern; allRecords: EvidenceEvent[]; visibleRecords: EvidenceEvent[]; onClose: () => void }) {
 const current = patternWithEvidence(pattern, allRecords);
 const linked = allRecords.filter(e => current.evidenceIds.includes(e.id));
 const allowed = linked.filter(e => visibleRecords.some(v => v.id === e.id));
 return <ProfileModal title={`${pattern.title} — ${pattern.period}`} onClose={onClose}>
  <p className="metric-explanation">{pattern.id === 'reliability' ? 'This metric describes historical follow-through. It is not a judgment of character.' : pattern.id === 'financial' ? 'Stable is a user-provided reflection, not a derived financial assessment.' : 'This mock pattern is an interpretation of the linked activity, not an established truth. Confidence is illustrative.'}</p>
  <p className="metric-explanation">{allowed.length} of {linked.length} linked records visible. Sharing a pattern does not share its underlying evidence automatically. All verification is simulated.</p>
  <ul className="linked-evidence">{allowed.map(e => <li key={e.id}><strong>{e.title}</strong><EvidenceBadge kind={sourceLabels[e.sourceType]}/><p>{e.category} · <time dateTime={e.timestamp}>{e.timestamp.slice(0, 10)}</time>{e.outcome && ` · ${e.outcome}`}</p><p>{e.source} · {e.verification}</p></li>)}</ul>
 </ProfileModal>;
}
