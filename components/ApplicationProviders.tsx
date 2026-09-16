'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CommitmentProvider } from './commitments/CommitmentProvider';

/** Public snapshots never enter an account route, and account routes never fetch demo data. */
export function ApplicationProviders({ children }: { children: ReactNode }) {
 const pathname = usePathname();
 if (pathname === '/me' || pathname.startsWith('/me/') || pathname === '/sign-in' || pathname.startsWith('/sign-in/')) return children;
 return <CommitmentProvider>{children}</CommitmentProvider>;
}
