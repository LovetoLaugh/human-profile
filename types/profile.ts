export type ProfilePerspective = 'Me' | 'Family' | 'Friend' | 'Neighbor' | 'Employer' | 'Landlord' | 'Custom';
export type EvidenceKind = 'Self-reported' | 'Observed' | 'Verified';
export interface User { name: string; firstName: string; initials: string; }
export interface CurrentState { label: string; updated: string; metrics: { label: string; value: string; icon: string }[]; }
export interface WellbeingMetric { label: string; value: string; unit?: string; change: string; color: string; values: number[]; }
export type EvidenceSourceType = import('../domain/evidence/types').EvidenceType;
export type AudienceType = 'public' | 'friend' | 'neighbor' | 'employer' | 'landlord' | 'family';
export type ProfileSection = 'about' | 'current-state' | 'wellbeing' | 'reliability' | 'work' | 'community' | 'family' | 'financial' | 'evidence' | 'interests' | 'growth' | 'references';
export type PermissionSettings = Record<ProfileSection, Record<AudienceType, boolean>>;
export type PatternId = 'reliability' | 'relationships' | 'community' | 'growth' | 'financial';
export type { EvidenceEvent } from '../domain/evidence/types';
export interface BehavioralPattern {
 id: string; title: string; value: string; detail: string; observations: string;
 period: string; icon: string; color: string; confidence?: 'High' | 'Medium' | 'Low';
 evidenceIds: string[]; kinds: EvidenceKind[]; perspectives: ProfilePerspective[];
}
export type { Commitment } from '../domain/commitments/types';
export interface ProfileReference { id: string; text: string; source: string; kind: EvidenceKind; perspectives: ProfilePerspective[]; }

export interface AboutProfile {
 name: string;
 description: string;
 about: string;
 interests: string[];
 goals: string[];
 skills: string[];
 values: string[];
}
export interface ProfileTimelineEvent {
 id: string;
 title: string;
 group: 'Recent updates' | 'Today' | 'This week' | 'Last month';
 evidenceIds: string[];
}
