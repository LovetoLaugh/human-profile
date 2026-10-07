'use client';
import { useAuth, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecipientResult } from '@/application/sharing-service';
import { SharedEvidenceView } from './SharedEvidenceView';

export function RecipientSession({ ownerId, shareId }: { ownerId: string; shareId: string }) {
 const { isLoaded, isSignedIn, userId } = useAuth();
 const path = `/shared/${ownerId}/${shareId}`;
 if (!isLoaded) return <p role="status">Checking your session…</p>;
 if (!isSignedIn) return <section className="card profile-header"><h2>Sign-in required</h2><p>Only the intended recipient can accept this invitation. A link alone does not grant access.</p><Link className="profile-button" prefetch={false} href={`/sign-in?next=${encodeURIComponent(path)}`}>Sign in to view invitation</Link></section>;
 return <><div className="owner-toolbar"><Link href="/me">My private profile</Link><UserButton /></div><RecipientShare key={userId} ownerId={ownerId} shareId={shareId}/></>;
}
export function RecipientShare({ ownerId, shareId }: { ownerId: string; shareId: string }) {
 const [result, setResult] = useState<RecipientResult | null>(null);
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const sequence = useRef(0);
 const invalidate = useCallback(() => { ++sequence.current; }, []);
 const load = useCallback(async (accept = false) => {
  const requestNumber = ++sequence.current;
  setBusy(true); setResult(null); setError('');
  try {
   const response = await fetch(`/api/shared/${ownerId}/${shareId}`, { cache: 'no-store', method: accept ? 'POST' : 'GET', ...(accept ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept' }) } : {}) });
   const data = await response.json();
   if (!response.ok) throw new Error(data.error || 'This invitation is unavailable.');
   if (requestNumber === sequence.current) setResult(data);
  } catch (e) { if (requestNumber === sequence.current) setError(e instanceof Error ? e.message : 'This invitation could not be loaded.'); }
  finally { if (requestNumber === sequence.current) setBusy(false); }
 }, [ownerId, shareId]);
 useEffect(() => {
  void load(); const refresh = () => void load();
  const timer = setInterval(refresh, 30000); window.addEventListener('focus', refresh);
  return () => { invalidate(); clearInterval(timer); window.removeEventListener('focus', refresh); };
 }, [load, invalidate]);
 useEffect(() => {
  if (result?.status !== 'active') return;
  const expires = Date.parse(result.view.expiresAt);
  const timer = setInterval(() => { if (Date.now() >= expires) { setResult({ status: 'expired' }); clearInterval(timer); } }, 1000);
  return () => clearInterval(timer);
 }, [result]);
 return <>
  {busy && <p role="status">Checking current access…</p>}
  {error && <p role="alert">{error} Verify that you are signed in with the intended account.</p>}
  {result?.status === 'accept' && <section className="card profile-header"><h2>Accept invitation</h2><p>Your verified email matches this invitation. Accepting binds it to this signed-in account.</p><button className="profile-button primary" disabled={busy} onClick={() => void load(true)}>Accept and view evidence</button></section>}
  {result?.status === 'active' && <SharedEvidenceView view={result.view}/>}
  {result?.status === 'expired' && <p role="status">This share has expired. Ask the owner for a new invitation.</p>}
  {result?.status === 'revoked' && <p role="status">The owner has revoked this share. Future access is unavailable.</p>}
  <button className="profile-button" disabled={busy} onClick={() => void load()}>Check access again</button>
  <p>This view is read-only. Access and current evidence permissions are checked on every request. Revocation cannot erase copies already made.</p>
 </>;
}
