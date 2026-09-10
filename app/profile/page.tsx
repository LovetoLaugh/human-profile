import type { Metadata } from 'next';
import { ProfilePage } from '@/components/profile/ProfilePage';
export const metadata: Metadata = { title: 'My Profile — Human Profile', description: 'Your evolving profile: current state, patterns, evidence, and sharing on your terms.' };
export default function Page() { return <ProfilePage/>; }
