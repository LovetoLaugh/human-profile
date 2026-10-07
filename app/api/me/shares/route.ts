import { resolveAuthenticatedIdentity } from '@/server/clerk-identity';
import { getSharingService } from '@/server/sharing-backend';
import { ownerSharingHandler } from '@/server/sharing-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = ownerSharingHandler(resolveAuthenticatedIdentity, getSharingService);
export const POST = GET;
