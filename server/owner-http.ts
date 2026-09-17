import type { AuthenticatedIdentity } from '../application/authenticated-identity';
import type { ProfileService } from '../application/profile-service';
import { ownerOperation } from './owner-operations';
import { UnauthorizedError } from './owner-identity';
import { RequestError } from './commands';
import { OwnerStorageConfigurationError, type OwnerStorageMode } from './owner-storage-configuration';
import { DynamoConflictError, DynamoLimitError } from '../persistence/dynamodb-store';

export function ownerHandler(resolveIdentity: () => Promise<AuthenticatedIdentity | null>, service: () => Promise<ProfileService>, storage: () => OwnerStorageMode) {
 return async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
  try {
   const view = await ownerOperation(request, resolveIdentity, service);
   return Response.json({ ...view, mode: storage() === 'dynamodb' ? 'owner-dynamodb' : 'owner-local' }, { headers });
  } catch (error) {
   const status = error instanceof UnauthorizedError ? 401 : error instanceof RequestError ? 400 : error instanceof DynamoConflictError ? 409 : error instanceof DynamoLimitError ? 413 : 503;
   const message = error instanceof OwnerStorageConfigurationError ? 'Private profile storage is not configured. Contact the site owner; no temporary fallback is used.' : status === 409 ? 'Your profile changed concurrently. Reload saved data before trying again.' : status === 413 ? 'This change exceeds the supported record or transaction size. Nothing was saved.' : status === 401 ? 'Sign in to access your private profile.' : status === 400 ? 'That action could not be processed. Check your entries and try again.' : 'Your private profile could not be loaded or saved. Please try again.';
   return Response.json({ error: message }, { status, headers });
  }
 };
}
