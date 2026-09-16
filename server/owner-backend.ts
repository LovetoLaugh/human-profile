import { join } from 'node:path';
import { ProfileService } from '../application/profile-service';
import type { RuntimeEnvironment } from './runtime-mode';
import { runtimeMode } from './runtime-mode';
import { TemporaryOwnerStore } from '../persistence/temporary-owner-store';

export function ownerStorageMode(environment: RuntimeEnvironment): 'local' | 'temporary' {
 return runtimeMode(environment) === 'public-demo' ? 'temporary' : 'local';
}
export async function createOwnerService(environment: RuntimeEnvironment) {
 const store = ownerStorageMode(environment) === 'temporary'
  ? new TemporaryOwnerStore()
  : new (await import('../persistence/file-store')).FileStore(join(environment.HUMAN_PROFILE_DATA_DIR || '.human-profile-data', 'owners'));
 return new ProfileService(store, undefined, 'empty');
}
let backend: Promise<ProfileService> | undefined;
export function getOwnerService() { return backend ??= createOwnerService(process.env); }
