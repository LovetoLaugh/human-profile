import type { Metadata } from 'next';
import './globals.css';
import { CommitmentProvider } from '@/components/commitments/CommitmentProvider';
const title = 'Human Profile — People. Context. Trust.';
const socialDescription = 'Explore an evidence-driven approach to human context, behavioral patterns, and purpose-based sharing.';
export const metadata: Metadata = {
 metadataBase: new URL('https://human-profile.vercel.app/'),
 title,
 description: 'An interactive platform exploring human context through evidence, behavioral patterns, and purpose-based sharing.',
 applicationName: 'Human Profile',
 robots: { index: true, follow: true },
 openGraph: { title, description: socialDescription, url: 'https://human-profile.vercel.app/', siteName: 'Human Profile', type: 'website' },
 twitter: { card: 'summary', title, description: socialDescription },
 icons: { icon: '/icon.svg' },
 manifest: '/manifest.json',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><CommitmentProvider>{children}</CommitmentProvider></body></html>; }
