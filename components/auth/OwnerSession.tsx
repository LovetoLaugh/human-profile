'use client';
import { useAuth, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CommitmentProvider, ProfileDataBoundary } from '../commitments/CommitmentProvider';

export function OwnerSession({ children }: { children: ReactNode }) {
 const { isLoaded, isSignedIn, userId } = useAuth();
 if (!isLoaded) return <main className="account-shell"><h1>Your Human Profile</h1><p role="status">Checking your session…</p></main>;
 if (!isSignedIn) return <main className="account-shell"><h1>Sign in to your profile</h1><Link className="profile-button" href="/sign-in">Continue with Google</Link></main>;
 // Switching accounts destroys the old in-memory snapshot. This is UI isolation, not API authorization.
 return <><header className="owner-toolbar"><Link href="/">Human Profile · Public demo</Link><UserButton /></header><CommitmentProvider key={userId} experience="owner"><ProfileDataBoundary experience="owner">{children}</ProfileDataBoundary></CommitmentProvider></>;
}
