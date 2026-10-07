import 'server-only';
import { auth } from '@clerk/nextjs/server';
import type { AuthenticatedIdentity } from '../application/authenticated-identity';
import { authenticationConfigured } from './auth-configuration';
import { authenticatedIdentity } from './owner-identity';

/** Clerk is confined to this infrastructure adapter. No email or request owner field is trusted. */
export async function resolveAuthenticatedIdentity(): Promise<AuthenticatedIdentity | null> {
 if (!authenticationConfigured(process.env)) return null;
 const session = await auth({ acceptsToken: 'session_token' });
 return session.userId ? authenticatedIdentity(session.userId) : null;
}

/** Email invitations are matched only to Clerk's server-verified email addresses. */
export async function resolveRecipientIdentity() {
 const identity = await resolveAuthenticatedIdentity();
 if (!identity) return null;
 const { currentUser } = await import('@clerk/nextjs/server');
 const { verifiedRecipient } = await import('./recipient-identity');
 return verifiedRecipient(identity.subject, await currentUser());
}
