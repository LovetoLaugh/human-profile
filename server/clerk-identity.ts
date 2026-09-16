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
