import type { Repositories, RepositoryStore } from '../application/repositories';
import { MemoryStore } from './memory-store';
export class DemoLimitError extends Error {}
/** Per-visitor, bounded, ephemeral memory. Instances never share the local development partition. */
export class DemoStore implements RepositoryStore {
 private sessions = new Map<string, { store: MemoryStore; touched: number }>();
 constructor(private now = () => Date.now(), private ttl = 30 * 60_000, private capacity = 50) {}
 transaction<T>(ownerId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
  const now = this.now();
  for (const [id, entry] of this.sessions) if (now - entry.touched >= this.ttl) this.sessions.delete(id);
  let session = this.sessions.get(ownerId);
  if (!session) {
   if (this.sessions.size >= this.capacity) this.sessions.delete(this.sessions.keys().next().value!);
   session = { store: new MemoryStore(), touched: now };
  }
  session.touched = now;
  this.sessions.delete(ownerId); this.sessions.set(ownerId, session);
  return session.store.transaction(ownerId, async repositories => {
   const result = await work(repositories);
   const commitments = await repositories.commitments.listForUser(ownerId);
   const evidence = await repositories.evidence.listForUser(ownerId);
   if (commitments.length > 250 || evidence.length > 500 || evidence.reduce((sum, e) => sum + e.auditHistory.length, 0) > 1500) {
    throw new DemoLimitError('This demo session is full. Open a new private browser session to start again.');
   }
   return result;
  });
 }
}
