import { mkdir, open, readFile, rename, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Repositories, RepositoryStore, UserDocument } from '../application/repositories';
import { emptyDocument, repositoriesFor } from './document-repositories';

export class PersistenceError extends Error {}
const code = (error: unknown) => (error as NodeJS.ErrnoException).code;
export class FileStore implements RepositoryStore {
 constructor(private directory: string) {}
 async transaction<T>(ownerId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(ownerId)) throw new PersistenceError('Invalid storage owner.');
  const file = join(this.directory, `${ownerId}.json`), lock = `${file}.lock`;
  try { await mkdir(this.directory, { recursive: true, mode: 0o700 }); }
  catch { throw new PersistenceError('Local storage is unavailable.'); }
  // Directory creation is exclusive across processes. A crashed lock fails closed; see reset docs.
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt++) {
   try { await mkdir(lock); acquired = true; break; }
   catch (error) {
    if (code(error) !== 'EEXIST') throw new PersistenceError('Cannot lock local storage.');
    await new Promise(resolve => setTimeout(resolve, 20));
   }
  }
  if (!acquired) throw new PersistenceError('Local storage is busy. Retry, or inspect the lock after stopping the server.');
  try {
   let document: UserDocument;
   try {
    document = JSON.parse(await readFile(file, 'utf8')) as UserDocument;
    if (document.version !== 1 || document.ownerId !== ownerId || !Number.isInteger(document.revision)
     || !Array.isArray(document.commitments) || !Array.isArray(document.evidence)
     || [...document.commitments, ...document.evidence].some(r => r.ownerId !== ownerId || typeof r.id !== 'string')
     || (document.profile && document.profile.ownerId !== ownerId)) throw new Error('Invalid document');
   } catch (error) {
    if (code(error) === 'ENOENT') document = emptyDocument(ownerId);
    else throw new PersistenceError('Local data could not be read. It has not been replaced.');
   }
   const before = JSON.stringify(document);
   const result = await work(repositoriesFor(document));
   if (JSON.stringify(document) !== before) {
    document.revision++;
    await this.publish(file, document);
   }
   return result;
  } finally { await rmdir(lock); }
 }
 protected async publish(file: string, document: UserDocument): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
   const handle = await open(temporary, 'wx', 0o600);
   try { await handle.writeFile(JSON.stringify(document, null, 2)); await handle.sync(); }
   finally { await handle.close(); }
   await rename(temporary, file);
  } catch { throw new PersistenceError('Save failed. Reload to check the last saved state before retrying.'); }
  finally { await unlink(temporary).catch(() => undefined); }
 }

}
