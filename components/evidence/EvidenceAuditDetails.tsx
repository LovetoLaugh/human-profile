'use client';
import { useState } from 'react';
import type { EvidenceEvent } from '@/types/profile';
import type { EvidenceCommand, EvidenceContext } from '@/domain/evidence/types';
import { applyEvidenceCommand, availableEvidenceActions, contributesToPatterns } from '@/domain/evidence/services';
import { useCommitments } from '../commitments/CommitmentProvider';

const actionLabels: Record<EvidenceCommand['action'], string> = {
 'verification-requested': 'Request verification', verified: 'Mark as verified (demo)', disputed: 'Dispute',
 'dispute-resolved': 'Resolve dispute', corrected: 'Correct text', revoked: 'Revoke',
};
export function EvidenceAuditDetails({ event, preview }: { event: EvidenceEvent; preview: boolean }) {
 const { dispatch, reliability, saving, error: persistenceError, dataNotice } = useCommitments();
 const [reason, setReason] = useState('');
 const [title, setTitle] = useState(event.title);
 const [description, setDescription] = useState(event.description);
 const [notice, setNotice] = useState('');
 const [editing, setEditing] = useState(false);
 const eligible = contributesToPatterns(event);
 const contribution = !eligible ? `Excluded: ${event.verificationStatus}.`
  : event.relatedPattern === 'reliability' ? reliability.evidence.some(e => e.id === event.id) ? 'Included in the current reliability calculation.' : 'Not included: outside the observation window or not an eligible commitment outcome.'
  : event.relatedPattern ? 'Available as supporting evidence for an illustrative pattern; no additional score is calculated.' : 'No profile pattern is linked.';
 async function act(action: EvidenceCommand['action']) {
  try {
   const source = { type: 'external-source' as const, source: 'Independent reviewer (mock)', sourceId: 'demo-reviewer', demo: true };
   const context: EvidenceContext = { id: crypto.randomUUID(), at: new Date().toISOString(),
    actor: action === 'verified' ? source : { type: 'user', source: 'Profile owner (demo)', demo: true },
    note: reason || (action === 'verified' ? 'Simulated independent confirmation; no external system was contacted.' : undefined) };
   const command: EvidenceCommand = action === 'verified' ? { action, source } : action === 'corrected' ? { action, changes: { title, description } } : { action };
   applyEvidenceCommand(event, command, context);
   if (!await dispatch({ type: 'evidence', id: event.id, command, context, at: context.at })) { setNotice('Save was not confirmed. Check the persistence error and reload before retrying.'); return; }
   setNotice(`${actionLabels[action]} updated.`); setEditing(false); setReason('');
  } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update evidence.'); }
 }
 return <section className="profile-detail">
  <h3>Evidence context</h3><dl>
   <dt>Original provenance</dt><dd>{event.provenance} · {event.source}{event.sourceId && ` · ${event.sourceId}`}</dd>
   <dt>Verification status</dt><dd>{event.verificationStatus}</dd>
   {event.verificationSource && <><dt>Last confirmation source</dt><dd>{event.verificationSource.source} · {event.verificationSource.sourceId}{event.verificationSource.demo && ' · Demo only'}</dd></>}
   <dt>Created</dt><dd>{event.createdAt}</dd><dt>Occurred</dt><dd>{event.timestamp}</dd>
   <dt>Visibility</dt><dd>{preview ? 'Included in this audience preview' : event.visibility.join(', ') || 'Me only'}</dd>
   {event.confidence && <><dt>Confidence</dt><dd>{event.confidence}</dd></>}
   {event.relatedEntityId && <><dt>Related entity</dt><dd>{event.relatedEntityType}: {event.relatedEntityId}</dd></>}
   <dt>Why this exists</dt><dd>{event.type === 'commitment-outcome' ? 'Human Profile recorded a commitment outcome. This does not independently confirm the work.' : 'An activity or statement was recorded by the source above.'}</dd>
   <dt>Pattern</dt><dd>{event.relatedPattern ?? 'None'} · {contribution}</dd>
  </dl>
  {!preview && <><h3>Audit history</h3><p>{dataNotice}. Verification actions are simulated.</p><ol className="evidence-audit-list">{event.auditHistory.map(entry => <li key={entry.id}>
   <strong>{entry.action}</strong> · <time dateTime={entry.timestamp}>{entry.timestamp}</time>
   <p>{entry.actor.source} ({entry.actor.type}){entry.actor.sourceId && ` · ${entry.actor.sourceId}`}{entry.actor.demo && ' · Demo'}</p>
   {entry.note && <p>{entry.note}</p>}
   <details><summary>Inspect recorded values</summary>{entry.previous && <><h4>Before</h4><pre>{JSON.stringify(entry.previous, null, 2)}</pre></>}<h4>After</h4><pre>{JSON.stringify(entry.next, null, 2)}</pre></details>
  </li>)}</ol>
  {availableEvidenceActions(event).length > 0 && <section><h3>Prototype actions</h3><p>Local demo only. Nothing is sent to an external verifier. Disputes, corrections, resolution and revocation require a reason.</p>
   <label className="evidence-field">Reason / note<textarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)}/></label>
   {editing && <><p>Text corrections preserve the original history and invalidate prior verification. Commitment outcomes and dates require a future revision workflow.</p><label className="evidence-field">Title<input value={title} maxLength={160} onChange={e => setTitle(e.target.value)}/></label><label className="evidence-field">Description<textarea value={description} maxLength={2000} onChange={e => setDescription(e.target.value)}/></label></>}
   <div className="profile-actions">{availableEvidenceActions(event).map(action => <button disabled={saving} key={action} className="profile-button" onClick={() => action === 'corrected' && !editing ? setEditing(true) : act(action)}>{action === 'corrected' && editing ? 'Save correction' : actionLabels[action]}</button>)}</div>
  </section>}
  {persistenceError && <p role="alert">{persistenceError}</p>}
  {notice && <p role="status">{notice}</p>}</>}
  {preview && <p>Owner audit notes and editing controls are private.</p>}
 </section>;
}
