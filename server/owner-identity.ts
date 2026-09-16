import { createHash } from 'node:crypto';
import type { AuthenticatedIdentity } from '../application/authenticated-identity';
export class UnauthorizedError extends Error {}
/** Accept only the verified session subject passed by the authentication adapter. */
export function authenticatedIdentity(subject: string | null | undefined): AuthenticatedIdentity {
 if (!subject?.trim()) throw new UnauthorizedError('Sign in to access your private profile.');
 return { subject };
}
/** Namespaced, filename-safe ownership key; email and request parameters are not inputs. */
export function privateOwnerKey(identity: AuthenticatedIdentity): string {
 const { subject } = authenticatedIdentity(identity.subject);
 return `owner-${createHash('sha256').update(subject).digest('hex')}`;
}
