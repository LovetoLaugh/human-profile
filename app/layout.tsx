import type { Metadata } from 'next';
import './globals.css';
import { CommitmentProvider } from '@/components/commitments/CommitmentProvider';
export const metadata: Metadata = { title: 'Human Profile — Your life, in context', description: 'An interactive product prototype exploring human context through evidence, patterns, and purpose-based sharing. Simulated demo data.', icons: { icon: '/icon.svg' }, manifest: '/manifest.json' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><CommitmentProvider>{children}</CommitmentProvider></body></html>; }
