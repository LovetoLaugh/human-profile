'use client';
import { useState } from 'react';
import { useCommitments } from '../commitments/CommitmentProvider';
import { NewCommitmentForm } from '../commitments/NewCommitmentForm';
import { CommitmentListItem } from '../commitments/CommitmentListItem';
import { EvidenceBrowser, EvidenceDetails } from '../profile/ProfileEvidence';
import { AboutEditor, ProfileAbout } from '../profile/ProfileAbout';
import { ProfileModal } from '../profile/ProfileModal';
import { ReliabilityEvidencePanel } from '../evidence/ReliabilityEvidencePanel';

/** Owner data only. No demo identity, mocked indicators or fictional history. */
export function OwnerProfile() {
 const { state, profile, mode, reliability, dispatch, saveProfile, saving } = useCommitments();
 const [editing, setEditing] = useState(false);
 const [creating, setCreating] = useState(false);
 const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
 const [showReliability, setShowReliability] = useState(false);
 const [limit, setLimit] = useState(12);
 const currentEvidence = state.evidence.find(record => record.id === selectedEvidence);
 return <main className="owner-profile">
  <section className="card profile-header"><span className="eyebrow">PRIVATE OWNER PROFILE</span>
   <h1>{profile.about.name || 'Your Human Profile'}</h1><p>{profile.about.description || 'Your context, commitments, and evidence start here.'}</p>
   <p>{mode === 'owner-dynamodb' ? 'Durable private storage: your saved profile, commitments, and evidence persist across visits and server restarts.' : 'Development storage: your private profile is saved on this server’s local filesystem. This is not a production database.'} Avoid sensitive information in this milestone.</p>
   <p>This profile is separate from Alex Morgan’s public demo. No information is shared with other users. Verification actions remain simulations; no health or wearable integrations are connected.</p>
  </section>
  <section><ProfileAbout profile={profile.about} showAbout showInterests editable onEdit={() => setEditing(true)}/></section>
  <section className="card profile-header"><h2>Reliability</h2>
   <p>{reliability.result.eligibleCommitments ? `${reliability.result.followThroughRate}% on time across ${reliability.result.eligibleCommitments} eligible commitments.` : 'No eligible outcomes yet. Reliability will be derived from your recorded commitment evidence.'}</p>
   <button className="evidence-link" onClick={() => setShowReliability(true)}>Inspect reliability evidence</button>
  </section>
  <section><div className="section-heading"><h2>Your commitments</h2><button className="profile-button primary" onClick={() => setCreating(true)}>+ New Commitment</button></div>
   <div className="card commitment-page-list">{state.commitments.length === 0 && <p className="profile-subtitle">No commitments yet. Create one when you are ready.</p>}
    {state.commitments.slice(0, limit).map(commitment => <CommitmentListItem key={commitment.id} commitment={commitment} onAction={(type, id) => { if (!saving) void dispatch({ type, id, at: new Date().toISOString() }); }} onEvidence={() => setSelectedEvidence(commitment.evidenceIds[0] ?? null)}/>)}</div>
   {state.commitments.length > limit && <button className="profile-button load-more" onClick={() => setLimit(limit + 12)}>Show more commitments</button>}
  </section>
  <EvidenceBrowser records={state.evidence} onSelect={event => setSelectedEvidence(event.id)}/>
  {editing && <ProfileModal title="Edit your profile" onClose={() => setEditing(false)}><AboutEditor initial={profile.about} onCancel={() => setEditing(false)} onSave={async about => { if (await saveProfile({ ...profile, about })) setEditing(false); }}/></ProfileModal>}
  {creating && <NewCommitmentForm onClose={() => setCreating(false)} onSave={async (input, id, at) => { if (!await dispatch({ type: 'create', input, id, at })) return false; setCreating(false); return true; }}/ >}
  {currentEvidence && <EvidenceDetails key={currentEvidence.id} event={currentEvidence} onClose={() => setSelectedEvidence(null)}/>}
  {showReliability && <ReliabilityEvidencePanel visibleRecords={state.evidence} onClose={() => setShowReliability(false)}/>}
 </main>;
}
