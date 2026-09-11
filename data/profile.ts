import { createEvidence } from '../domain/evidence/services';
import { commitmentSeed } from './mocks/commitments';
import type { User, CurrentState, WellbeingMetric, BehavioralPattern, EvidenceEvent, ProfilePerspective, ProfileReference } from '@/types/profile';
export const user: User = { name: 'Adithya Rayaprolu', firstName: 'Adithya', initials: 'AR' };
export const perspectives: ProfilePerspective[] = ['Me', 'Family', 'Friend', 'Neighbor', 'Employer', 'Landlord', 'Custom'];
export const currentState: CurrentState = { label: 'Calm & Focused', updated: '5 minutes ago', metrics: [{ label: 'Stress', value: 'Low', icon: 'leaf' }, { label: 'Energy', value: 'Good', icon: 'bolt' }, { label: 'Focus', value: 'High', icon: 'focus' }, { label: 'Social', value: 'Available', icon: 'people' }] };
export const wellbeing: WellbeingMetric[] = [
 { label: 'Sleep', value: '7h 12m', unit: 'avg', change: '+24 min from last week', color: 'purple', values: [5, 7, 6, 8, 7, 9, 8] },
 { label: 'Stress', value: 'Low', change: 'Steady & manageable', color: 'green', values: [8, 6, 7, 4, 5, 3, 4] },
 { label: 'Energy', value: 'Good', change: 'Trending upward', color: 'amber', values: [3, 5, 4, 7, 6, 8, 9] },
 { label: 'Mood', value: 'Positive', change: 'A little brighter lately', color: 'blue', values: [3, 4, 3, 6, 5, 8, 7] },
];
export const supportedPerspectives: ProfilePerspective[] = ['Me', 'Employer', 'Landlord', 'Neighbor'];

// Raw evidence is the source of truth. All records and verification are simulated.
const record = (event: Pick<EvidenceEvent, 'id' | 'title' | 'timestamp' | 'category' | 'source' | 'kind' | 'icon' | 'perspectives' | 'pattern'>): EvidenceEvent => createEvidence({
 ...event, type: 'activity', description: `${event.title}. Illustrative activity record.`,
 sourceType: event.kind.toLowerCase() as EvidenceEvent['sourceType'],
 provenance: event.kind === 'Verified' ? 'external-source' : event.kind === 'Observed' ? 'human-profile' : 'user',
 sourceId: event.kind === 'Verified' ? `mock-organizer:${event.id}` : undefined,
 relatedPattern: event.pattern ?? null,
 visibility: event.perspectives.map(p => p.toLowerCase() as EvidenceEvent['visibility'][number]),
}, { id: `created:${event.id}`, at: event.timestamp, actor: { type: event.kind === 'Verified' ? 'external-source' : event.kind === 'Observed' ? 'human-profile' : 'user', source: event.source, sourceId: event.kind === 'Verified' ? `mock-organizer:${event.id}` : undefined, demo: true } });
export const evidence: EvidenceEvent[] = [
 ...commitmentSeed.evidence,
 ...Array.from({ length: 24 }, (_, i) => record({ id: `interaction-${i + 1}`, pattern: 'relationships', title: `Supportive interaction ${i + 1}`, timestamp: new Date(Date.UTC(2026, 8, 8 - i * 6, 12)).toISOString(), category: 'Relationships', source: 'Connection activity log (mock)', kind: 'Observed', icon: 'people', perspectives: [] })),
 ...Array.from({ length: 18 }, (_, i) => record({ id: `community-${i + 1}`, pattern: 'community', title: i === 0 ? 'Contributed to neighborhood cleanup' : `Community contribution ${i + 1}`, timestamp: new Date(Date.UTC(2026, 8, 7 - i * 9, 12)).toISOString(), category: 'Community', source: 'Organizer confirmation (mock)', kind: 'Verified', icon: 'community', perspectives: ['Neighbor'] })),
 ...Array.from({ length: 8 }, (_, i) => record({ id: `learning-${i + 1}`, pattern: 'growth', title: i === 0 ? 'Completed learning activity' : `Completed learning activity ${i + 1}`, timestamp: new Date(Date.UTC(2026, 8 - i, 8, 12)).toISOString(), category: 'Learning', source: 'Personal learning journal (mock)', kind: 'Self-reported', icon: 'book', perspectives: ['Employer'] })),
].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

const derive = (id: string) => {
 const records = evidence.filter(e => e.pattern === id);
 return { evidenceIds: records.map(e => e.id), kinds: [...new Set(records.map(e => e.kind))], count: records.length };
};
export const patterns: BehavioralPattern[] = [
 { id: 'relationships', title: 'Relationships', value: 'Consistent & supportive', detail: 'Repeated connection and support', observations: `${derive('relationships').count} observed interactions`, period: 'Last 6 months', icon: 'people', color: 'purple', confidence: 'Medium', ...derive('relationships'), perspectives: [] },
 { id: 'community', title: 'Community', value: 'Active', detail: 'Participation in your community', observations: `${derive('community').count} contributions`, period: 'Last 6 months', icon: 'community', color: 'blue', ...derive('community'), perspectives: ['Neighbor'] },
 { id: 'growth', title: 'Personal Growth', value: 'Consistent', detail: `${derive('growth').count} learning activities this year`, observations: 'Learning across 8 months', period: 'This year', icon: 'growth', color: 'green', ...derive('growth'), perspectives: ['Employer'] },
];
// Qualitative labels/confidence above are mock interpretations of linked activity,
// not validated scoring models. Reliability counts are calculated from raw records.
export const references: ProfileReference[] = [{ id: 'ref-1', text: 'Completed the previous rental agreement as recorded.', source: 'Previous landlord reference (mock)', kind: 'Verified', perspectives: ['Landlord'] }];
export const sharedInterests = ['Neighborhood walks', 'Community volunteering'];
export function isShared(item: { perspectives: ProfilePerspective[] }, perspective: ProfilePerspective) {
 return perspective === 'Me' || item.perspectives.includes(perspective);
}
