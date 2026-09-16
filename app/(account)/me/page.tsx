import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { resolveAuthenticatedIdentity } from '@/server/clerk-identity';
import { OwnerSession } from '@/components/auth/OwnerSession';
import { OwnerProfile } from '@/components/owner/OwnerProfile';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My private profile — Human Profile', description: 'Your private Human Profile.' };

export default async function MePage() {
 const identity = await resolveAuthenticatedIdentity();
 if (!identity) redirect('/sign-in');
 return <OwnerSession><OwnerProfile /></OwnerSession>;
}
