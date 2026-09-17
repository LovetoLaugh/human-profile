import { resolveAuthenticatedIdentity } from '@/server/clerk-identity';
import { getOwnerService, ownerStorageMode } from '@/server/owner-backend';
import { ownerHandler } from '@/server/owner-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handler = ownerHandler(resolveAuthenticatedIdentity, getOwnerService, () => ownerStorageMode(process.env));
export const GET = handler;
export const POST = handler;
