import type { Metadata } from 'next';
import { CommitmentsPage } from '@/components/commitments/CommitmentsPage';
export const metadata: Metadata = { title: 'Commitments — Human Profile', description: 'Record commitments, inspect outcomes, and understand historical follow-through.' };
export default function Page() { return <CommitmentsPage/>; }
