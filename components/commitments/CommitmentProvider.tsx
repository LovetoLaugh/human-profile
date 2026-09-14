'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CommitmentAction } from '@/domain/commitments/pipeline';
import type { ProfileState } from '@/application/repositories';
import type { RuntimeMode } from '@/server/runtime-mode';
import type { ProfileCommand, ProfileView } from '@/application/profile-service';

type RuntimeView = ProfileView & { mode: RuntimeMode };
interface CommitmentContextValue extends RuntimeView {
 dataNotice: string;
 saving: boolean;
 error: string;
 dispatch: (action: CommitmentAction) => Promise<boolean>;
 saveProfile: (profile: ProfileState) => Promise<boolean>;
}
const LoadingErrorContext = createContext('');
const CommitmentContext = createContext<CommitmentContextValue | null>(null);
/** Server-confirmed snapshot shared by every route. Failed saves never update product state. */
export function CommitmentProvider({ children }: { children: ReactNode }) {
 const [view, setView] = useState<RuntimeView | null>(null);
 const [error, setError] = useState('');
 const [saving, setSaving] = useState(false);
 const busy = useRef(false);
 const generation = useRef(0);
 const load = useCallback(async () => {
  if (busy.current) return;
  const token = ++generation.current;
  try {
   const response = await fetch('/api/profile-state', { cache: 'no-store' });
   const result = await response.json();
   if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Unable to load the profile. Please try again.');
   if (generation.current === token) { setView(result); setError(''); }
  } catch (cause) { if (generation.current === token) setError(cause instanceof Error && !cause.message.includes('JSON') ? cause.message : 'Unable to load the profile. Please try again.'); }
 }, []);
 const invalidate = useCallback(() => { generation.current++; }, []);
 useEffect(() => {
  void load();
  const timer = window.setInterval(() => void load(), 60_000);
  const focus = () => void load();
  window.addEventListener('focus', focus);
  return () => { invalidate(); window.clearInterval(timer); window.removeEventListener('focus', focus); };
 }, [load, invalidate]);
 async function save(command: ProfileCommand) {
  if (busy.current) return false;
  busy.current = true; generation.current++; setSaving(true); setError('');
  try {
   const response = await fetch('/api/profile-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
   const result = await response.json();
   if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Unable to load the profile. Please try again.');
   setView(result); return true;
  } catch (cause) {
   setError(`${cause instanceof Error && !cause.message.includes('JSON') ? cause.message : 'Unable to save. Please try again.'} Reload saved data before retrying if the response was interrupted.`);
   return false;
  } finally { busy.current = false; setSaving(false); }
 }
 return <>
  {error && <div className="profile-notice" role="alert">{error} <button className="profile-button" disabled={saving} onClick={() => void load()}>Reload saved data</button></div>}
  {saving && <div className="profile-notice" role="status">Saving…</div>}
  <LoadingErrorContext.Provider value={error}><CommitmentContext.Provider value={view ? { ...view, saving, error, dataNotice: view.mode === 'public-demo' ? 'Simulated demo data · Changes may reset' : 'Saved on this computer',
   dispatch: action => action.type === 'refresh-clock' ? load().then(() => true) : save(action),
   saveProfile: profile => save({ type: 'profile', profile }),
  } : null}>{children}</CommitmentContext.Provider></LoadingErrorContext.Provider>
 </>;
}
export function useCommitments() {
 const context = useContext(CommitmentContext);
 if (!context) throw new Error('CommitmentProvider is required.');
 return context;
}

/** Gate data-dependent screens only; server page content always renders. */
export function ProfileDataBoundary({ children }: { children: ReactNode }) {
 const view = useContext(CommitmentContext);
 const error = useContext(LoadingErrorContext);
 if (!view) return <main className="profile-loading-shell"><section aria-label="Profile preparation" aria-busy={!error}><p role="status">{error ? 'Your profile is unavailable. Use the reload control to try again.' : 'Preparing your profile…'}</p><div className="profile-skeleton" aria-hidden="true"><div className="card" /><div className="card" /><div className="card" /></div></section></main>;
 return <>{view.mode === 'public-demo' && <div className="public-demo-notice"><strong>Interactive Product Prototype</strong><span>Fictional data · Temporary isolated state · Simulated verification · No real health or wearable integrations.</span></div>}{children}</>;
}
