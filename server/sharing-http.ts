import type { AuthenticatedIdentity } from '../application/authenticated-identity';
import type { SharingService } from '../application/sharing-service';
import type { RecipientIdentity } from '../domain/sharing/share';
import { ShareInputError, ShareUnavailableError } from '../domain/sharing/share';
import { DynamoConflictError, DynamoLimitError } from '../persistence/dynamodb-store';
import { OwnerStorageConfigurationError } from './owner-storage-configuration';
import { privateOwnerKey, UnauthorizedError } from './owner-identity';
import { assertOwnerRequest } from './request-boundary';
import { RequestError } from './commands';

const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', Vary: 'Cookie, Authorization' };
const response = (data: unknown, status = 200) => Response.json(data, { status, headers });
function failure(error: unknown) {
 if (error instanceof UnauthorizedError) return response({ error: 'Sign in to access this invitation.' }, 401);
 if (error instanceof ShareUnavailableError) return response({ error: 'This invitation is unavailable for this account.' }, 404);
 if (error instanceof ShareInputError) return response({ error: error.message }, 400);
 if (error instanceof RequestError) return response({ error: 'Invalid sharing request.' }, 400);
 if (error instanceof DynamoConflictError) return response({ error: 'Data changed concurrently. Reload before trying again.' }, 409);
 if (error instanceof DynamoLimitError) return response({ error: 'This change exceeds the supported storage limit. Nothing was saved.' }, 413);
 if (error instanceof OwnerStorageConfigurationError) return response({ error: 'Private sharing storage is not configured.' }, 503);
 return response({ error: 'Sharing could not be loaded or saved. Reload before retrying.' }, 503);
}
async function body(request: Request): Promise<Record<string, unknown>> {
 if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RequestError();
 const raw = await request.text();
 if (raw.length > 32000) throw new RequestError();
 let value;
 try { value = JSON.parse(raw); } catch { throw new RequestError(); }
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError();
 return value;
}
export const validShareId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
export function invitationPath(ownerId: string, id: string) { return `/shared/${ownerId}/${id}`; }
export function ownerSharingHandler(identity: () => Promise<AuthenticatedIdentity | null>, service: () => Promise<SharingService>) {
 return async (request: Request) => {
  try {
   const user = await identity(); if (!user) throw new UnauthorizedError();
   assertOwnerRequest(request);
   const owner = privateOwnerKey(user);
   const app = await service();
   if (request.method === 'GET') return response({ shares: (await app.list(owner)).map(s => ({ ...s, path: invitationPath(owner, s.id) })) });
   if (request.method !== 'POST') throw new RequestError();
   const value = await body(request);
   if (value.action === 'preview') return response({ view: await app.preview(owner, value.input) });
   if (value.action === 'create') { const created = await app.create(owner, value.input); return response({ ...created, path: invitationPath(owner, created.id) }, 201); }
   if (!validShareId(value.id)) throw new RequestError();
   if (value.action === 'revoke') return response(await app.revoke(owner, value.id));
   if (value.action === 'inspect') return response(await app.ownerPreview(owner, value.id));
   throw new RequestError();
  } catch (error) { return failure(error); }
 };
}
export function recipientSharingHandler(identity: () => Promise<RecipientIdentity | null>, service: () => Promise<SharingService>) {
 return async (request: Request, ownerId: string, id: string) => {
  try {
   const user = await identity(); if (!user) throw new UnauthorizedError();
   assertOwnerRequest(request);
   if (!/^owner-[a-f0-9]{64}$/.test(ownerId) || !validShareId(id)) throw new ShareUnavailableError();
   if (!['GET', 'POST'].includes(request.method)) throw new RequestError();
   if (request.method === 'POST' && (await body(request)).action !== 'accept') throw new RequestError();
   return response(await (await service()).recipient(ownerId, id, user, request.method === 'POST'));
  } catch (error) { return failure(error); }
 };
}
