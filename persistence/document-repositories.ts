import type { Owned, ProfileRepository, RecordRepository, Repositories, UserDocument } from '../application/repositories';
export const clone = <T>(value: T): T => structuredClone(value);
export function emptyDocument(ownerId: string): UserDocument { return { version: 1, ownerId, revision: 0, commitments: [], evidence: [] }; }
export function repositoriesFor(document: UserDocument): Repositories {
 const check = (ownerId: string) => { if (ownerId !== document.ownerId) throw new Error('Owner does not match repository scope.'); };
 function records<T extends { id: string }>(items: Owned<T>[]): RecordRepository<T> {
  return {
   async getById(ownerId, id) { check(ownerId); const item = items.find(r => r.id === id); return item ? clone(item) : undefined; },
   async listForUser(ownerId) { check(ownerId); return clone(items); },
   async save(record) {
    check(record.ownerId);
    const index = items.findIndex(r => r.id === record.id);
    if (index < 0) items.unshift(clone(record)); else items[index] = clone(record);
   },
  };
 }
 const profile: ProfileRepository = {
  async get(ownerId) { check(ownerId); return document.profile ? clone(document.profile) : undefined; },
  async save(record) { check(record.ownerId); document.profile = clone(record); },
 };
 return { commitments: records(document.commitments), evidence: records(document.evidence), profile };
}
