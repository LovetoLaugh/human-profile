import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Human Profile — Your life, in context', description: 'A personal space for your state, patterns, and the things that matter. People. Context. Trust.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
