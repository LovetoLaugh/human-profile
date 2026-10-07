import type { SharedView } from '@/domain/sharing/share';
/** The owner preview and recipient page render the same server-projected DTO. */
export function SharedEvidenceView({ view }: { view: SharedView }) {
 return <section className="card profile-header"><h2>{view.purpose}</h2>
  <p>Purpose audience: {view.audience} · Access expires {new Date(view.expiresAt).toLocaleString()}</p>
  <p>Only selected, currently permitted evidence is included. No overall score or unrelated profile information is shared. Verification actions in this prototype are simulations.</p>
  {view.evidence.length === 0 && <p role="status">No selected evidence is currently available under the owner’s permissions.</p>}
  {view.evidence.map(e => <article className="sharing-evidence" key={e.id}><h3>{e.title}</h3><p>{e.description}</p><p>{e.sourceType} · {e.verificationStatus}</p><p>Occurred: {new Date(e.timestamp).toLocaleString()} · Recorded: {new Date(e.createdAt).toLocaleString()}</p></article>)}
 </section>;
}
