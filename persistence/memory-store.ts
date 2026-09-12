import type { Repositories, RepositoryStore, UserDocument } from '../application/repositories';
import { clone, emptyDocument, repositoriesFor } from './document-repositories';

/** Isolated test adapter with the same transaction/ownership contract as the file store. */
export class MemoryStore implements RepositoryStore {
 private documents = new Map<string, UserDocument>();
 private queue: Promise<unknown> = Promise.resolve();
 transaction<T>(ownerId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
  const result = this.queue.then(async () => {
   const document = clone(this.documents.get(ownerId) ?? emptyDocument(ownerId));
   const value = await work(repositoriesFor(document));
   this.documents.set(ownerId, clone({ ...document, revision: document.revision + 1 }));
   return value;
  });
  this.queue = result.catch(() => undefined);
  return result;
 }
}
