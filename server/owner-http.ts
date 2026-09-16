import type { AuthenticatedIdentity } from '../application/authenticated-identity';
import type { ProfileService } from '../application/profile-service';
import { ownerOperation } from './owner-operations';
import { UnauthorizedError } from './owner-identity';
import { RequestError } from './commands';

export function ownerHandler(resolveIdentity: () => Promise<AuthenticatedIdentity | null>, service: () => Promise<ProfileService>, temporary: boolean) {
 return async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
  try {
   const view = await ownerOperation(request, resolveIdentity, service);
   return Response.json({ ...view, mode: temporary ? 'owner-temporary' : 'owner-local' }, { headers });
  } catch (error) {
   const status = error instanceof UnauthorizedError ? 401 : error instanceof RequestError ? 400 : 503;
   const message = status === 401 ? 'Sign in to access your private profile.' : status === 400 ? 'That action could not be processed. Check your entries and try again.' : 'Your private profile could not be loaded or saved. Please try again.';
   return Response.json({ error: message }, { status, headers });
  }
 };
}
