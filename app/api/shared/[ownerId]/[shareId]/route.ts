import { resolveRecipientIdentity } from '@/server/clerk-identity';
import { getSharingService } from '@/server/sharing-backend';
import { recipientSharingHandler } from '@/server/sharing-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handle = recipientSharingHandler(resolveRecipientIdentity, getSharingService);
export async function GET(request: Request, context: { params: Promise<{ ownerId: string; shareId: string }> }) {
 const { ownerId, shareId } = await context.params;
 return handle(request, ownerId, shareId);
}
export const POST = GET;
