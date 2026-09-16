import type { AuthenticatedIdentity } from '../application/authenticated-identity';
import type { ProfileService } from '../application/profile-service';
import { parseCommand, RequestError } from './commands';
import { assertOwnerRequest } from './request-boundary';
import { privateOwnerKey, UnauthorizedError } from './owner-identity';

/** Testable HTTP boundary. Production injects only the Clerk server identity adapter. */
export async function ownerOperation(request: Request, resolveIdentity: () => Promise<AuthenticatedIdentity | null>, service: () => Promise<ProfileService>) {
 const identity = await resolveIdentity();
 if (!identity) throw new UnauthorizedError('Sign in to access your private profile.');
 assertOwnerRequest(request);
 const owner = privateOwnerKey(identity);
 if (request.method === 'GET') return (await service()).read(owner);
 if (request.method !== 'POST') throw new RequestError('Unsupported method.');
 if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RequestError('JSON is required.');
 const text = await request.text();
 if (text.length > 64000) throw new RequestError('Request is too large.');
 let value: unknown;
 try { value = JSON.parse(text); } catch { throw new RequestError('Invalid JSON.'); }
 return (await service()).execute(owner, parseCommand(value, 'owner'));
}
