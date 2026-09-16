import type { RepositoryStore, Repositories } from '../application/repositories';
import { MemoryStore } from './memory-store';

export class OwnerCapacityError extends Error {}
/** Non-production owner storage. Separate instances and partitions from the anonymous demo. */
export class TemporaryOwnerStore implements RepositoryStore {
 private owners = new Map<string, { store: MemoryStore; touched: number; pending: number }>();
 constructor(private now = () => Date.now(), private ttl = 30 * 60_000, private capacity = 50) {}
 async transaction<T>(ownerId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
  const now = this.now();
  for (const [id, entry] of this.owners) if (!entry.pending && now - entry.touched >= this.ttl) this.owners.delete(id);
  let entry = this.owners.get(ownerId);
  if (!entry) {
   if (this.owners.size >= this.capacity) throw new OwnerCapacityError('Temporary profile storage is full. Try again later.');
   entry = { store: new MemoryStore(), touched: now, pending: 0 };
   this.owners.set(ownerId, entry);
  }
  entry.pending++;
  entry.touched = now;
  try {
   return await entry.store.transaction(ownerId, async repositories => {
    const result = await work(repositories);
    const commitments = await repositories.commitments.listForUser(ownerId);
    const evidence = await repositories.evidence.listForUser(ownerId);
    if (commitments.length > 250 || evidence.length > 500 || evidence.reduce((sum, record) => sum + record.auditHistory.length, 0) > 1500) {
     throw new OwnerCapacityError('This temporary profile has reached its record limit.');
    }
    return result;
   });
  } finally { entry.pending--; entry.touched = this.now(); }
 }
}
