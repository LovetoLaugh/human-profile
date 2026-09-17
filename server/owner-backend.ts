import { join } from 'node:path';
import { ProfileService } from '../application/profile-service';
import type { RuntimeEnvironment } from './runtime-mode';
import { ownerStorageMode, dynamoConfiguration } from './owner-storage-configuration';
export { ownerStorageMode } from './owner-storage-configuration';

export async function createOwnerService(environment: RuntimeEnvironment) {
 if (ownerStorageMode(environment) === 'dynamodb') {
  const configuration = dynamoConfiguration(environment);
  const { createDynamoStore } = await import('../persistence/dynamodb-client');
  return new ProfileService(createDynamoStore(configuration), undefined, 'empty');
 }
 const { FileStore } = await import('../persistence/file-store');
 return new ProfileService(new FileStore(join(environment.HUMAN_PROFILE_DATA_DIR || '.human-profile-data', 'owners')), undefined, 'empty');
}
let backend: Promise<ProfileService> | undefined;
export function getOwnerService() {
 return backend ??= createOwnerService(process.env).catch(error => { backend = undefined; throw error; });
}
