import { createEvidence } from '../domain/evidence/services';
import { evidenceV2Demos } from './mocks/evidence';
import { evidence as homeEvidence, patterns as homePatterns, wellbeing } from './profile';
import type { AboutProfile, AudienceType, BehavioralPattern, EvidenceEvent, EvidenceKind, EvidenceSourceType, PermissionSettings, ProfileSection, ProfileTimelineEvent, WellbeingMetric } from '@/types/profile';

export const initialAbout: AboutProfile = {
 name: 'Alex Morgan', description: 'Curious. Building. Learning.',
 about: 'I’m building meaningful products and making space for learning, connection, and everyday progress.',
 interests: ['Technology', 'AI', 'Travel', 'Fitness', 'Community'],
 goals: ['Build meaningful products', 'Continue learning', 'Maintain strong relationships', 'Contribute to community'],
 skills: ['Product thinking', 'TypeScript', 'React', 'Collaboration'],
 values: ['Curiosity', 'Care', 'Follow-through', 'Openness'],
};
export const audiences: AudienceType[] = ['public', 'friend', 'neighbor', 'employer', 'landlord', 'family'];
export const sectionLabels: Record<ProfileSection, string> = {
 about: 'About', 'current-state': 'Current State', wellbeing: 'Health / Well-being',
 reliability: 'Reliability', work: 'Work History', community: 'Community', family: 'Family',
 evidence: 'Evidence', financial: 'Financial Responsibility', interests: 'Interests', growth: 'Growth', references: 'References',
};
const defaults: Record<AudienceType, ProfileSection[]> = {
 public: ['about'], friend: ['about', 'current-state', 'interests'],
 neighbor: ['about', 'community', 'reliability', 'evidence', 'interests'],
 employer: ['about', 'reliability', 'work', 'growth', 'evidence'],
 landlord: ['reliability', 'evidence', 'references'],
 family: ['about', 'current-state', 'wellbeing', 'reliability', 'community', 'family', 'evidence', 'interests', 'growth', 'references'],
};
export const initialPermissions = Object.fromEntries(
 (Object.keys(sectionLabels) as ProfileSection[]).map(section => [section, Object.fromEntries(audiences.map(audience => [audience, defaults[audience].includes(section)]))]),
) as PermissionSettings;
export const sourceLabels: Record<EvidenceSourceType, EvidenceKind> = { 'self-reported': 'Self-reported', observed: 'Observed', verified: 'Verified' };

// Historical domain outcomes plus activity and personal check-ins; counts are derived.
// Source assignments are mock provenance, never claims of external verification.
const extras: EvidenceEvent[] = Array.from({ length: 24 }, (_, i) => createEvidence({
 type: 'activity', id: `profile-checkin-${i + 1}`, title: i === 0 ? 'Feeling calm and focused' : i === 1 ? 'Financial check-in: stable' : `Personal check-in ${i + 1}`,
 description: i === 0 ? 'Updated current state: calm and focused, with low stress and good energy.' : i === 1 ? 'Personal reflection on financial routines. No accounts or payment systems connected.' : 'A user-provided reflection on everyday life.',
 category: i === 1 ? 'Financial' : 'Current State', timestamp: new Date(Date.UTC(2026, 8, 9 - i, 18, 25)).toISOString(),
 source: 'Personal check-in (mock)', sourceType: 'self-reported', provenance: 'user',
 relatedPattern: i === 1 ? 'financial' : null, pattern: i === 1 ? 'financial' : undefined,
 icon: 'profile', perspectives: [], visibility: i === 1 ? [] : ['friend', 'family'],
}, { id: `created:profile-checkin-${i + 1}`, at: new Date(Date.UTC(2026, 8, 9 - i, 18, 25)).toISOString(), actor: { type: 'user', source: 'Owner (mock)', demo: true } }));
// Commitment records retain the observed provenance produced by the domain service.
export const profileEvidence: EvidenceEvent[] = [...homeEvidence, ...extras, ...evidenceV2Demos].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
export function evidenceCounts(records: EvidenceEvent[]) {
 return { 'self-reported': records.filter(e => e.sourceType === 'self-reported').length, observed: records.filter(e => e.sourceType === 'observed').length, verified: records.filter(e => e.sourceType === 'verified').length, total: records.length };
}
export const profilePatterns: BehavioralPattern[] = [...homePatterns.map(p => ({
 ...p,
 value: p.id === 'relationships' ? 'Consistent' : p.value,
 confidence: p.id === 'community' ? 'High' as const : p.confidence,
 evidenceIds: p.id === 'community' ? [...p.evidenceIds, 'outcome:commitment-3'] : p.evidenceIds,
 kinds: [...new Set(profileEvidence.filter(e => p.evidenceIds.includes(e.id) || (p.id === 'community' && e.id === 'outcome:commitment-3')).map(e => e.kind))],
})), {
 id: 'financial', title: 'Financial Responsibility', value: 'Stable', detail: 'Mock data · Personal reflection', observations: 'Not a financial assessment', period: 'Latest check-in', icon: 'wallet', color: 'amber', evidenceIds: ['profile-checkin-2'], kinds: ['Self-reported'], perspectives: [],
}];
export const profileWellbeing: (WellbeingMetric & { sourceType: EvidenceSourceType; icon: string })[] = [
 ...wellbeing.slice(0, 3).map((m, i) => ({ ...m, unit: i === 0 ? 'average' : m.unit, sourceType: i === 0 ? 'observed' as const : 'self-reported' as const, icon: ['moon', 'leaf', 'bolt'][i] })),
 { label: 'Activity', value: 'Active', change: 'Regular movement this week', color: 'green', values: [4, 6, 5, 8, 6, 7, 8], sourceType: 'observed', icon: 'growth' },
 { ...wellbeing[3], sourceType: 'self-reported', icon: 'sun' },
];
const augustCompleted = profileEvidence.filter(e => e.pattern === 'reliability' && e.outcome === 'completed' && e.timestamp.startsWith('2026-08')).slice(0, 8);
const augustCommunity = profileEvidence.filter(e => e.pattern === 'community' && e.timestamp.startsWith('2026-08')).slice(0, 3);
export const timelineEvents: ProfileTimelineEvent[] = [
 { id: 't1', group: 'Today', title: 'Completed dashboard PR', evidenceIds: ['outcome:commitment-1'] },
 { id: 't2', group: 'Today', title: 'Updated current state', evidenceIds: ['profile-checkin-1'] },
 { id: 't3', group: 'Today', title: 'Completed fitness class', evidenceIds: ['outcome:commitment-2'] },
 { id: 't4', group: 'This week', title: 'Helped a neighbor', evidenceIds: ['outcome:commitment-3'] },
 { id: 't5', group: 'This week', title: 'Added a new learning activity', evidenceIds: ['learning-1'] },
 { id: 't6', group: 'This week', title: 'Completed family commitment', evidenceIds: ['outcome:commitment-4'] },
 { id: 't7', group: 'Last month', title: `Completed ${augustCompleted.length} commitments`, evidenceIds: augustCompleted.map(e => e.id) },
 { id: 't8', group: 'Last month', title: '1 commitment completed late', evidenceIds: ['outcome:commitment-51'] },
 { id: 't9', group: 'Last month', title: `Participated in ${augustCommunity.length} community activities`, evidenceIds: augustCommunity.map(e => e.id) },
];
export const patternSections: Record<string, ProfileSection> = { reliability: 'reliability', relationships: 'family', community: 'community', growth: 'growth', financial: 'financial' };
export function canSeeEvidence(e: EvidenceEvent, audience: AudienceType | 'me', permissions: PermissionSettings) {
 if (audience === 'me') return true;
 if (!permissions.evidence[audience] || !e.visibility.includes(audience)) return false;
 const categorySection: Record<string, ProfileSection> = { Work: 'work', 'Well-being': 'wellbeing', Family: 'family', Relationships: 'family', Community: 'community', Learning: 'growth', 'Current State': 'current-state', Financial: 'financial' };
 const section = categorySection[e.category];
 // Agreement receipts are individually selected evidence, independent of a financial assessment.
 return !section || permissions[section][audience];
}

export const profileMetadata = { completeness: 78, lastUpdated: '5 min ago' };
export const profileContext = {
 work: 'Building Human Profile · Product development · 2026',
 family: 'Making time for shared activities and following through on family plans.',
 reference: 'Previous landlord: completed the previous rental agreement as recorded.',
 referenceSource: 'Previous landlord reference · Mock confirmation only',
};
