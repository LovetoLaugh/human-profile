'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CommitmentAction } from '@/domain/commitments/pipeline';
import type { ProfileState } from '@/application/repositories';
import type { ProfileCommand, ProfileView } from '@/application/profile-service';

interface CommitmentContextValue extends ProfileView {
 saving: boolean;
 error: string;
 dispatch: (action: CommitmentAction) => Promise<boolean>;
 saveProfile: (profile: ProfileState) => Promise<boolean>;
}
const CommitmentContext = createContext<CommitmentContextValue | null>(null);
/** Server-confirmed snapshot shared by every route. Failed saves never update product state. */
export function CommitmentProvider({ children }: { children: ReactNode }) {
 const [view, setView] = useState<ProfileView | null>(null);
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
   if (!response.ok) throw new Error(result.error);
   if (generation.current === token) { setView(result); setError(''); }
  } catch (cause) { if (generation.current === token) setError(cause instanceof Error ? cause.message : 'Unable to load. Retry.'); }
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
   if (!response.ok) throw new Error(result.error);
   setView(result); return true;
  } catch (cause) {
   setError(`${cause instanceof Error ? cause.message : 'Save failed.'} Reload saved data before retrying if the response was interrupted.`);
   return false;
  } finally { busy.current = false; setSaving(false); }
 }
 return <>
  {error && <div className="profile-notice" role="alert">{error} <button className="profile-button" disabled={saving} onClick={() => void load()}>Reload saved data</button></div>}
  {saving && <div className="profile-notice" role="status">Saving…</div>}
  {!view ? <p className="profile-notice" role="status">{error ? 'Local data is unavailable.' : 'Loading saved profile…'}</p> : <CommitmentContext.Provider value={{ ...view, saving, error,
   dispatch: action => action.type === 'refresh-clock' ? load().then(() => true) : save(action),
   saveProfile: profile => save({ type: 'profile', profile }),
  }}>{children}</CommitmentContext.Provider>}
 </>;
}
export function useCommitments() {
 const context = useContext(CommitmentContext);
 if (!context) throw new Error('CommitmentProvider is required.');
 return context;
}
