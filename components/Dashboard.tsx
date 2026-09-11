'use client';
import { patternWithEvidence } from '@/domain/patterns/evidence-profile';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { EvidenceBadge } from './EvidenceBadge';
import { EvidencePanel } from './EvidencePanel';
import { useCommitments } from './commitments/CommitmentProvider';
import { ReliabilityEvidencePanel } from './evidence/ReliabilityEvidencePanel';
import { commitmentCategories, commitmentStatusLabels } from '@/domain/commitments/types';
import { user, currentState, wellbeing, patterns, perspectives, supportedPerspectives, isShared, references, sharedInterests } from '@/data/profile';
import type { BehavioralPattern, Commitment, ProfilePerspective, WellbeingMetric, EvidenceEvent } from '@/types/profile';

export function Sidebar() {
 const pathname = usePathname();
 const nav = [['home','Home'], ['profile','My Profile'], ['heart','Family'], ['share','Share & Access'], ['people','Connections'], ['check','Commitments'], ['community','Community'], ['growth','Insights'], ['shield','Privacy'], ['settings','Settings']];
 return <aside className="sidebar"><Link className="brand" href="/" aria-label="Human Profile home"><span className="brand-mark"><span/><span/><span/></span><span>human profile<span className="tagline">People. Context. Trust.</span></span></Link><div className="nav-label">YOUR SPACE</div><nav>{nav.map(([icon,label],i)=> {
 const href = i === 0 ? '/' : i === 1 ? '/profile' : i === 5 ? '/commitments' : null;
 const active = pathname === href;
 const content = <><Icon name={icon}/><span>{label}</span>{active&&<span className="active-dot"/>}</>;
 return href ? <Link key={label} href={href} className={`nav-item ${active?'active':''}`} aria-current={active?'page':undefined}>{content}</Link> : <button key={label} className={`nav-item ${i===8?'nav-divider':''}`} disabled title="Coming in a future release">{content}</button>;
 })}</nav><div className="sidebar-bottom"><div className="privacy-note"><span className="privacy-icon"><Icon name="lock" size={18}/></span><strong>Your story. Your control.</strong><p>You decide what to share,<br/>and who gets to see it.</p></div><div className="sidebar-user"><span className="avatar">AR</span><span><strong>Adithya Rayaprolu</strong><small>Personal workspace</small></span><Icon name="chevron" size={16}/></div></div></aside>;
}
export function TopBar({ label = 'Overview' }: { label?: string }) {
 const [query,setQuery]=useState(''); const [notifications,setNotifications]=useState(false);
 return <header className="topbar"><div className="breadcrumb">My workspace <Icon name="chevron" size={13}/><span>{label}</span></div><div className="top-actions"><div className="search-wrap"><label className="search"><Icon name="search" size={17}/><input aria-label="Search people with permission" placeholder="Search people with permission" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌕</kbd></label>{query&&<div className="popover">No shared profiles match “{query}”.<small>Only people who grant you access appear here.</small></div>}</div><div className="notification-wrap"><button className="icon-button" aria-label="Notifications" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Icon name="bell"/><span className="notification-dot"/></button>{notifications&&<div className="popover notification-popover"><strong>You’re all caught up</strong><small>Access requests and profile updates will appear here.</small></div>}</div><span className="top-user-name">{user.firstName}</span><span className="avatar small">{user.initials}</span></div></header>;
}
export function StateMetric({label,value,icon}:{label:string;value:string;icon:string}) { return <div className="state-metric"><span><Icon name={icon} size={16}/>{label}</span><strong><i/>{value}</strong></div>; }
export function CurrentStateCard() {
 return <section className="current-state"><div className="state-main"><div className="eyebrow"><span className="live-dot"/> RIGHT NOW <span className="self-tag"><EvidenceBadge kind="Self-reported"/></span></div><div className="state-title"><div><h2>{currentState.label}</h2><p><span className="tiny-clock">◷</span> Updated {currentState.updated}</p></div><div className="state-orb"><Icon name="leaf" size={35}/></div></div><div className="state-metrics">{currentState.metrics.map(m=><StateMetric key={m.label} {...m}/>)}</div></div><div className="state-recommendation"><span className="sparkle">✧</span><div><strong>Good time for meaningful conversations</strong><p>You seem to be in a positive state this evening.</p><small>A gentle suggestion based on your check-in</small></div></div></section>;
}
export function TrendMiniChart({values,color}:{values:number[];color:string}) {
 const points=values.map((v,i)=>`${i*25},${42-v*3.5}`).join(' ');
 return <svg className={`trend ${color}`} viewBox="0 0 150 48" role="img" aria-label={`Seven-day trend: ${values.join(', ')}`}><path d="M0 43H150" stroke="currentColor" opacity=".12"/><polygon points={`0,48 ${points} 150,48`} fill="currentColor" opacity=".07"/><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/><circle cx="150" cy={42-values[6]*3.5} r="3" fill="currentColor"/></svg>;
}
export function WellbeingSnapshot() { return <section><div className="section-heading"><h2>Well-being snapshot</h2><span className="subtle">Last 7 days <Icon name="chevron" size={12}/></span></div><div className="wellbeing-grid">{wellbeing.map((m:WellbeingMetric,i)=><article className="card wellbeing-card" key={m.label}><div className="metric-label"><span className={`metric-icon ${m.color}`}><Icon name={['moon','leaf','bolt','sun'][i]} size={17}/></span>{m.label}<span className="mini-period">7d</span></div><div className="wellbeing-value">{m.value}<small>{m.unit}</small></div><TrendMiniChart values={m.values} color={m.color}/><div className="metric-change">{m.change}</div><EvidenceBadge kind="Self-reported"/></article>)}</div></section>; }
export function BehavioralPatternCard({pattern,onEvidence}:{pattern:BehavioralPattern;onEvidence:()=>void}) {
 return <article className="card pattern-card"><div className="pattern-top"><span className={`pattern-icon ${pattern.color}`}><Icon name={pattern.icon} size={19}/></span><span>{pattern.title}</span></div><h3 className={pattern.value.length > 15 ? 'long-pattern-value' : undefined}>{pattern.value}</h3><p>{pattern.detail}</p><p>{pattern.observations} · {pattern.period}</p><div className="pattern-badges">{pattern.kinds.map(kind=><EvidenceBadge key={kind} kind={kind}/>)}</div><div className="confidence">{pattern.confidence && <span className="confidence-label">Confidence: {pattern.confidence}</span>}<button className="evidence-link" onClick={onEvidence} aria-label={`View evidence for ${pattern.title}`}>View evidence <Icon name="arrow" size={12}/></button></div></article>;
}
export function CommitmentsList({items,onToggle,readOnly=false}:{items:Commitment[];onToggle:(id:string)=>void; readOnly?:boolean}) {
 const done=items.filter(c=>c.status==='completed'||c.status==='completed-late').length;
 return <section className="card commitments"><div className="panel-heading"><h2>{readOnly ? "Professional commitments" : "My commitments"}</h2><span className="count-pill">{done} of {items.length} done</span></div><div className="commitment-progress"><span style={{width:`${items.length ? done/items.length*100 : 0}%`}}/></div><div className="commitment-list">{items.map(c=>{
 const completed = c.status==='completed'||c.status==='completed-late';
 return <label className={`commitment ${completed?'completed':''}`} key={c.id}><input type="checkbox" disabled={readOnly||c.status!=='active'} checked={completed} onChange={()=>onToggle(c.id)}/><span className="check-box">{completed&&<Icon name="check" size={13}/>}</span><span className="commitment-name">{c.title}<small>{commitmentCategories[c.category]} · {c.status==='active'?'Self-reported':'Observed'}</small></span><span className={`status ${completed?'done':''}`}>{commitmentStatusLabels[c.status]}</span></label>;
 })}</div><div className="panel-footer"><Icon name="leaf" size={15}/><Link href="/commitments">View all commitments →</Link></div></section>;
}
export function ProfilePerspectiveSelector({value,onChange}:{value:ProfilePerspective;onChange:(v:ProfilePerspective)=>void}) { return <section className="card perspective-card"><div className="perspective-intro"><span className="perspective-symbol"><Icon name="share" size={22}/></span><div><h2>View my profile as…</h2><p>Different connections. The right context.</p></div><span className="preview-tag">PROFILE PREVIEW</span></div><div className="perspective-options" role="group" aria-label="Profile perspective">{perspectives.map((p,i)=><button key={p} disabled={!supportedPerspectives.includes(p)} title={!supportedPerspectives.includes(p)?"Preview coming soon":undefined} aria-pressed={value===p} className={value===p?'selected':''} onClick={()=>onChange(p)}><Icon name={['profile','heart','people','home','wallet','community','settings'][i]} size={16}/>{p}{value===p&&<Icon name="check" size={13}/>}</button>)}</div><p className="perspective-caption"><Icon name="lock" size={13}/>{value==='Me'?'Only you can see your full picture. You choose what others see.':value==='Custom'?'Custom preview starts private. No information is selected for sharing.':`${value} preview shows only the sample fields allowed for this relationship.`} <strong>No access is granted.</strong></p></section>; }
export function EvidenceFeed({items}:{items:EvidenceEvent[]}) {
 return <section className="card evidence-panel"><div className="panel-heading"><h2>Recent Evidence</h2><span className="subtle">Mock records</span></div><div className="evidence-list">{items.slice(0, 8).map((e,i)=><article key={e.id} className="evidence-item"><span className={`evidence-icon ${['green','purple','amber','blue','green'][i%5]}`}><Icon name={e.icon} size={16}/></span><div><strong>{e.title}</strong><p>{e.category} · <time dateTime={e.timestamp}>{e.timestamp.slice(0,10)} · {e.timestamp.slice(11,16)} UTC</time></p><span className="evidence-source">{e.source}</span><div><EvidenceBadge kind={e.kind}/></div><p>{e.verification}</p></div></article>)}</div></section>;
}
export function Dashboard() {
 const [perspective,setPerspective]=useState<ProfilePerspective>('Me');
 const { state, dispatch, reliability } = useCommitments();
 const [selectedPattern,setSelectedPattern]=useState<BehavioralPattern|null>(null);
 const privateView=perspective==='Me';
 const visiblePatterns=[reliability.pattern, ...patterns.map(p => patternWithEvidence(p, state.evidence))].filter(p=>isShared(p,perspective));
 const visibleEvidence=state.evidence.filter(e=>isShared(e,perspective));
 const visibleCommitments=state.commitments.filter(c=>privateView||c.visibility.some(a=>a===perspective.toLowerCase())).slice(0,5);
 const visibleReferences=references.filter(r=>isShared(r,perspective));
 function changePerspective(next:ProfilePerspective) { setSelectedPattern(null); setPerspective(next); }
 return <div className="app-shell">
  <a className="skip-link" href="#main-content">Skip to dashboard</a><Sidebar/>
  <div className="workspace"><TopBar/><main id="main-content">
   <div className="page-heading"><div><div className="eyebrow greeting-eyebrow">YOUR LIFE, IN CONTEXT</div><h1>Good evening, Adithya <span className="greeting-sun">☀</span></h1><p>Here’s your current state and what matters most.</p></div><span className="date-label"><span/> Wednesday, September 9 <span className="demo-badge">Demo</span></span></div>
   <ProfilePerspectiveSelector value={perspective} onChange={changePerspective}/>
   {!privateView&&<div className="preview-banner" role="status"><Icon name="shield" size={18}/><span>Previewing what {perspective==='Employer'?'an':'a'} <strong>{perspective}</strong> can see</span><button onClick={()=>changePerspective('Me')}>Back to my view</button></div>}
   <div className="dashboard-grid"><div className="main-column">
    {privateView&&<CurrentStateCard/>}
    <section className="patterns-section"><div className="section-heading"><div><h2>Patterns Over Time</h2><p>Patterns derived from your activity and verified evidence — not judgments.</p></div></div><div className="patterns-grid">{visiblePatterns.map(p=><BehavioralPatternCard key={p.id} pattern={p} onEvidence={()=>setSelectedPattern(p)}/>)}</div></section>
    {privateView&&<WellbeingSnapshot/>}
    {(privateView||perspective==='Neighbor')&&<section className="card sharing-summary"><h2>Shared interests</h2><p>{sharedInterests.join(' · ')}</p><EvidenceBadge kind="Self-reported"/></section>}
    {visibleReferences.length>0&&<section className="card sharing-summary"><h2>References</h2>{visibleReferences.map(r=><div key={r.id}><p>{r.text}</p><p>{r.source}</p><EvidenceBadge kind={r.kind}/><p>Confirmed in mock records</p></div>)}</section>}
    <div className="context-note"><Icon name="shield" size={18}/><p><strong>Raw evidence → Observed patterns → Profile.</strong> Patterns describe activity in context. They do not measure character or personal worth.</p></div>
   </div><aside className="right-column">
    {visibleCommitments.length>0&&<CommitmentsList items={visibleCommitments} readOnly={!privateView} onToggle={id=>dispatch({type:'complete',id,at:new Date().toISOString()})}/>}
    <EvidenceFeed items={visibleEvidence}/>
   </aside></div>
   <footer className="page-footer"><span><span className="footer-dot"/> Private by design. Human by nature.</span><span>Mock evidence & verification · Changes last for this session</span></footer>
  </main></div>
  {selectedPattern&&(selectedPattern.id==='reliability'?<ReliabilityEvidencePanel visibleRecords={visibleEvidence} preview={!privateView} onClose={()=>setSelectedPattern(null)}/>:<EvidencePanel pattern={selectedPattern} perspective={perspective} onClose={()=>setSelectedPattern(null)}/>)}
 </div>;
}
