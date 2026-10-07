import type { Metadata } from 'next';
import { RecipientSession } from '@/components/sharing/RecipientShare';
import { authenticationConfigured } from '@/server/auth-configuration';
import { validShareId } from '@/server/sharing-http';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Private invitation — Human Profile', description: 'Sign in to access a private invitation.', robots: { index: false, follow: false, noarchive: true }, referrer: 'no-referrer' };
export default async function SharedPage({ params }: { params: Promise<{ ownerId: string; shareId: string }> }) {
 const { ownerId, shareId } = await params;
 const valid = /^owner-[a-f0-9]{64}$/.test(ownerId) && validShareId(shareId);
 return <main className="account-shell"><h1>Human Profile invitation</h1>{!valid ? <p>This invitation is unavailable.</p> : !authenticationConfigured(process.env) ? <p>Sign-in is required and is not configured on this deployment.</p> : <RecipientSession ownerId={ownerId} shareId={shareId}/>}</main>;
}
