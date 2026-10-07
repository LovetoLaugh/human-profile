'use client';
import { useCallback, useEffect, useState } from 'react';
import { useCommitments } from '../commitments/CommitmentProvider';
import { SharedEvidenceView } from './SharedEvidenceView';
import { isEligible, shareAudiences, type SharedView } from '@/domain/sharing/share';
import type { AudienceType } from '@/types/profile';
import type { SharingService } from '@/application/sharing-service';
type ListedShare = Awaited<ReturnType<SharingService['list']>>[number] & { path: string };
async function api(body?: unknown) {
 const result = await fetch('/api/me/shares', { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
 const value = await result.json();
 if (!result.ok) throw new Error(value.error || 'Sharing could not be loaded or saved.');
 return value;
}
export function OwnerShares() {
 const { state, profile, saving } = useCommitments();
 const [shares, setShares] = useState<ListedShare[]>([]);
 const [loading, setLoading] = useState(true);
 const [purpose, setPurpose] = useState('');
 const [recipientEmail, setRecipientEmail] = useState('');
 const [audience, setAudience] = useState<AudienceType>('employer');
 const [expires, setExpires] = useState('');
 const [ids, setIds] = useState<string[]>([]);
 const [preview, setPreview] = useState<SharedView | null>(null);
 const [inspected, setInspected] = useState<SharedView | null>(null);
 const [previewKey, setPreviewKey] = useState('');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [notice, setNotice] = useState('');
 const [link, setLink] = useState('');
 const signature = JSON.stringify({ purpose, recipientEmail, audience, expires, ids, evidence: state.evidence, permissions: profile.permissions });
 const previewCurrent = !!preview && previewKey === signature;
 const refresh = useCallback(async () => {
  setLoading(true);
  try { setShares((await api()).shares); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load shares.'); }
  finally { setLoading(false); }
 }, []);
 useEffect(() => { void refresh(); }, [refresh]);
 async function run(work: () => Promise<void>) {
  setBusy(true); setError(''); setNotice('');
  try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Sharing failed. Reload before retrying.'); }
  finally { setBusy(false); }
 }
 const input = () => ({ purpose, recipientEmail, audience, evidenceIds: ids, expiresAt: expires ? new Date(expires).toISOString() : '' });
 async function copy(path: string) {
  const url = new URL(path, window.location.origin).href; setLink(url);
  try { await navigator.clipboard.writeText(url); setNotice('Invitation link copied. Send it yourself to the intended recipient.'); }
  catch { setNotice('Select and copy the invitation link below.'); }
 }
 return <section className="sharing-panel" aria-label="Purpose-based sharing">
  <div className="section-heading"><h2>Purpose-based sharing</h2></div>
  <p>Choose a recipient and a fixed selection of evidence. They must sign in with a verified matching email to accept. New evidence is never added automatically.</p>
  <p>Revocation stops future access but cannot erase copies already made by a recipient.</p>
  {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  <form className="card sharing-form" onSubmit={e => { e.preventDefault(); void run(async () => { const result = await api({ action: 'preview', input: input() }); setPreview(result.view); setPreviewKey(signature); setNotice('Preview ready. Review it before creating the invitation.'); }); }}>
   <fieldset disabled={busy || saving}><legend>Create a share</legend>
    <label>Purpose label<input required maxLength={120} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="For example: project collaboration" /></label>
    <label>Recipient email<input type="email" required maxLength={254} value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} autoComplete="off" /></label>
    <label>Audience permissions<select value={audience} onChange={e => { setAudience(e.target.value as AudienceType); setIds([]); }}>{shareAudiences.map(a => <option key={a}>{a}</option>)}</select></label>
    <label>Expires at (your local time)<input type="datetime-local" required value={expires} onChange={e => setExpires(e.target.value)} /></label>
    <fieldset><legend>Select evidence (up to 50)</legend>
     <p>Enable Evidence and the relevant category in sharing permissions above, and choose this audience on the commitment. Disputed or revoked evidence cannot be shared.</p>
     {state.evidence.length === 0 && <p>No evidence yet. Complete a commitment before creating a share.</p>}
     {state.evidence.map(e => { const eligible = isEligible(e, audience, profile.permissions); return <label className="sharing-choice" key={e.id}><input type="checkbox" disabled={!eligible && !ids.includes(e.id)} checked={ids.includes(e.id)} onChange={event => setIds(event.target.checked ? [...ids, e.id] : ids.filter(id => id !== e.id))}/><span>{e.title}{!eligible && ' — unavailable for this audience'}</span></label>; })}
    </fieldset>
    {!ids.length && <p>Select at least one eligible evidence record to preview.</p>}
    <button className="profile-button" disabled={!ids.length || ids.length > 50} type="submit">Preview recipient view</button>
   </fieldset>
  </form>
  {previewCurrent && <><h3>Recipient preview</h3><SharedEvidenceView view={preview!}/><button className="profile-button primary" disabled={busy || saving} onClick={() => void run(async () => {
   const result = await api({ action: 'create', input: input() }); setPreview(null); setInspected(result.view); setLink(new URL(result.path, window.location.origin).href); setNotice('Share created. Copy the invitation link and send it to the intended recipient.'); await refresh();
  })}>Create invitation</button></>}
  {link && <div className="sharing-link"><label htmlFor="invitation-link">Invitation link</label><input id="invitation-link" readOnly value={link} onFocus={e => e.target.select()}/><button className="profile-button" onClick={() => void copy(link)}>Copy invitation link</button></div>}
  <div className="section-heading"><h3>Your shares</h3><button className="profile-button" disabled={busy || loading} onClick={() => { setError(''); void refresh(); }}>Reload shares</button></div>
  {loading && <p role="status">Loading shares…</p>}{!loading && !shares.length && <p>No shares created yet.</p>}
  {shares.map(s => <article className="card profile-header" key={s.id}><h4>{s.purpose}</h4><p>{s.recipientEmail} · {s.audience} · {s.selectedCount} selected</p><p>{s.status} · {s.accepted ? 'Accepted' : 'Not yet accepted'} · Expires {new Date(s.expiresAt).toLocaleString()}</p><div className="profile-actions">
   <button className="profile-button" disabled={busy || s.status !== 'active'} onClick={() => void run(async () => { setInspected(null); const result = await api({ action: 'inspect', id: s.id }); if (result.view) setInspected(result.view); else setNotice(`This share is ${result.status}.`); })}>View current preview</button>
   <button className="profile-button" disabled={s.status !== 'active'} onClick={() => void copy(s.path)}>Copy link</button>
   <button className="profile-button" disabled={busy || s.status === 'revoked'} onClick={() => void run(async () => { await api({ action: 'revoke', id: s.id }); setInspected(null); setLink(''); setNotice('Share revoked. Future reads are blocked; existing copies cannot be erased.'); await refresh(); })}>Revoke share</button>
  </div></article>)}
  {inspected && <><h3>Current recipient view</h3><SharedEvidenceView view={inspected}/><button className="profile-button" onClick={() => setInspected(null)}>Close preview</button></>}
 </section>;
}
