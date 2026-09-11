'use client';
import { useState, type FormEvent } from 'react';
import type { AudienceType } from '@/types/profile';
import { audiences } from '@/data/profile-details';
import { commitmentCategories, type CommitmentCategory, type NewCommitment } from '@/domain/commitments/types';
import { createCommitment, deadlineFromLocalDate } from '@/domain/commitments/service';
import { ProfileModal } from '../profile/ProfileModal';

export function NewCommitmentForm({ onSave, onClose }: { onSave: (input: NewCommitment, id: string, at: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CommitmentCategory>('personal');
  const [visibility, setVisibility] = useState<AudienceType[]>([]);
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const dueDate = String(new FormData(event.currentTarget as HTMLFormElement).get('dueDate') ?? '');
      const input = { title, description, category, dueAt: deadlineFromLocalDate(dueDate), visibility };
      createCommitment(input, id, at); // Domain validation before dispatching the atomic transaction.
      onSave(input, id, at);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create commitment.');
    }
  }
  return <ProfileModal title="New Commitment" onClose={onClose}>
    <form className="about-editor commitment-form" onSubmit={submit}>
      <p>A commitment starts active. Its outcome becomes observed evidence when you resolve it.</p>
      <label>Title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Complete Human Profile evidence engine"/></label>
      <label>Description<textarea rows={3} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does following through look like?"/></label>
      <div className="commitment-form-row">
        <label>Category<select value={category} onChange={e => setCategory(e.target.value as CommitmentCategory)}>{(Object.keys(commitmentCategories) as CommitmentCategory[]).map(c => <option value={c} key={c}>{c === 'health' ? 'Health' : commitmentCategories[c]}</option>)}</select></label>
        <label>Due date<input type="date" name="dueDate"/></label>
      </div>
      <p>A due date means the end of that day in your local timezone. Without one, completion counts as on time.</p>
      <fieldset className="commitment-visibility"><legend>Visibility</legend><p>You always retain access. No audiences selected means Me only.</p>
        <label className="audience-option"><input type="checkbox" checked={visibility.length === 0} onChange={() => setVisibility([])}/>Me only</label>
        {audiences.map(a => <label className="audience-option" key={a}><input type="checkbox" checked={visibility.includes(a)} onChange={e => setVisibility(current => e.target.checked ? [...current, a] : current.filter(item => item !== a))}/><span className="capitalize">{a}</span></label>)}
      </fieldset>
      <p>Outcome evidence inherits this selection. Profile category permissions still apply; no actual access is granted.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="profile-actions"><button type="button" className="profile-button" onClick={onClose}>Cancel</button><button className="profile-button primary" type="submit">Save commitment</button></div>
    </form>
  </ProfileModal>;
}
