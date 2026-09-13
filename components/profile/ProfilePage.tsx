'use client';
import { useRef, useState } from 'react';
import { Sidebar, TopBar } from '../Dashboard';
import { Icon } from '../Icon';
import { audiences, canSeeEvidence, sectionLabels } from '@/data/profile-details';
import type { AboutProfile, AudienceType, BehavioralPattern, EvidenceEvent, ProfileSection } from '@/types/profile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileTabs, type ProfileTab } from './ProfileTabs';
import { ProfileOverview, PatternDetails } from './ProfileOverview';
import { EvidenceBrowser, EvidenceDetails } from './ProfileEvidence';
import { ProfileTimeline } from './ProfileTimeline';
import { AboutEditor, ProfileAbout } from './ProfileAbout';
import { PermissionMatrix } from './PermissionMatrix';
import { ProfileModal } from './ProfileModal';
import { useCommitments } from '../commitments/CommitmentProvider';
import { ReliabilityEvidencePanel } from '../evidence/ReliabilityEvidencePanel';
export function ProfilePage() {
 const { state, profile, saveProfile: persistProfile, dataNotice } = useCommitments();
 const profileEvidence = state.evidence;
 const [tab, setTab] = useState<ProfileTab>('Overview');
 const { about, permissions } = profile;
 const [audience, setAudience] = useState<AudienceType | 'me'>('me');
 const [showPreview, setShowPreview] = useState(false);
 const [editing, setEditing] = useState(false);
 const [sharing, setSharing] = useState(false);
 const [shareAudience, setShareAudience] = useState<AudienceType>('friend');
 const [selectedEvidence, setSelectedEvidence] = useState<EvidenceEvent | null>(null);
 const [selectedPattern, setSelectedPattern] = useState<BehavioralPattern | null>(null);
 const [notice, setNotice] = useState('');
 const previewSelect = useRef<HTMLSelectElement>(null);
 const canSee = (section: ProfileSection) => audience === 'me' || permissions[section][audience];
 const records = profileEvidence.filter(e => canSeeEvidence(e, audience, permissions));
 const currentEvidence = records.find(e => e.id === selectedEvidence?.id);
 async function saveProfile(next: AboutProfile) {
  setNotice('');
  if (!await persistProfile({ permissions, about: { ...next, interests: next.interests.filter(s => s.trim()), goals: next.goals.filter(s => s.trim()), skills: next.skills.filter(s => s.trim()), values: next.values.filter(s => s.trim()) } })) return;
  setEditing(false); setNotice('Profile updated.');
 }
 function viewAs(next: AudienceType | 'me') {
  setAudience(next); setSelectedEvidence(null); setSelectedPattern(null); setNotice('');
 }
 async function toggle(section: ProfileSection, target: AudienceType) {
  setNotice('');
  if (!await persistProfile({ about, permissions: { ...permissions, [section]: { ...permissions[section], [target]: !permissions[section][target] } } })) return;
  setNotice(`${sectionLabels[section]} visibility updated for ${target}. Other categories are unchanged.`);
 }
 return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to profile</a><Sidebar/><div className="workspace"><TopBar label="My Profile"/><main id="main-content" className="profile-page">
  <div className="section-heading"><span className="eyebrow greeting-eyebrow">YOUR LIFE, IN CONTEXT</span><span className="demo-badge">Mock profile</span></div>
  <ProfileHeader profile={about} audience={audience} showAbout={canSee('about')} total={profileEvidence.length} onEdit={() => setEditing(true)} onShare={() => setSharing(true)} onViewAs={() => { setShowPreview(true); requestAnimationFrame(() => previewSelect.current?.focus()); }}/>
  {showPreview && <section className="card profile-preview-control"><label htmlFor="profile-audience">View my profile as…</label><select id="profile-audience" ref={previewSelect} value={audience} onChange={e => viewAs(e.target.value as AudienceType | 'me')}><option value="me">Me</option>{audiences.map(a => <option value={a} key={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}</select><p>Uses the current local permission settings. No access is granted.</p></section>}
  {audience !== 'me' && <div className="preview-banner" role="status"><Icon name="shield" size={18}/><span>Previewing what {audience === 'employer' ? 'an' : 'a'} <strong className="capitalize">{audience}</strong> can see</span><button onClick={() => viewAs('me')}>Back to my view</button></div>}
  <ProfileTabs active={tab} onChange={setTab}/>
  {notice && <div className="profile-notice" role="status">{notice}</div>}
  <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
   {tab === 'Overview' && <ProfileOverview canSee={canSee} records={records} onPattern={setSelectedPattern} onEvidence={setSelectedEvidence} onViewAll={() => setTab('Evidence')}/>}
   {tab === 'Timeline' && <ProfileTimeline records={records} onSelect={setSelectedEvidence}/>}
   {tab === 'Evidence' && <EvidenceBrowser key={audience} records={records} onSelect={setSelectedEvidence}/>}
   {tab === 'About' && <ProfileAbout profile={about} showAbout={canSee('about')} showInterests={canSee('interests')} editable={audience === 'me'} onEdit={() => setEditing(true)}/>}
   {tab === 'Permissions' && <PermissionMatrix permissions={permissions} onToggle={toggle}/>}
  </div>
  <footer className="page-footer"><span><span className="footer-dot"/> Your profile. Your context. Your choice.</span><span>{dataNotice}</span></footer>
 </main></div>
 {editing && <ProfileModal title="Edit Profile" onClose={() => setEditing(false)}><AboutEditor initial={about} onSave={saveProfile} onCancel={() => setEditing(false)}/></ProfileModal>}
 {currentEvidence && <EvidenceDetails key={currentEvidence.id} preview={audience !== 'me'} event={currentEvidence} onClose={() => setSelectedEvidence(null)}/>}
 {selectedPattern && (selectedPattern.id === 'reliability' ? <ReliabilityEvidencePanel visibleRecords={records} preview={audience !== 'me'} onClose={() => setSelectedPattern(null)}/> : <PatternDetails pattern={selectedPattern} allRecords={profileEvidence} visibleRecords={records} onClose={() => setSelectedPattern(null)}/>)}
 {sharing && <ProfileModal title="Share Profile — local preview" onClose={() => setSharing(false)}><div className="profile-detail"><p>Choose an audience to review the information you would share. This prototype does not publish your profile or create a live sharing link.</p><label className="share-audience">Audience<select value={shareAudience} onChange={e => setShareAudience(e.target.value as AudienceType)}>{audiences.map(a => <option value={a} key={a}>{a}</option>)}</select></label><h3>Included categories</h3><ul className="about-list">{(Object.keys(sectionLabels) as ProfileSection[]).filter(section => permissions[section][shareAudience]).map(section => <li key={section}>{sectionLabels[section]}</li>)}</ul><p>{profileEvidence.filter(e => canSeeEvidence(e, shareAudience, permissions)).length} selected evidence records are visible.</p><div className="profile-actions"><button className="profile-button" onClick={() => { setSharing(false); setTab('Permissions'); }}>Edit permissions</button><button className="profile-button primary" onClick={() => { setSharing(false); setShowPreview(true); viewAs(shareAudience); setTab('Overview'); }}>Preview shared profile</button></div></div></ProfileModal>}
 </div>;
}
