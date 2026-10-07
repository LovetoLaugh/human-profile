import type { EvidenceEvent, AudienceType, PermissionSettings, ProfileSection } from '../../types/profile';
export function canSeeEvidence(e: EvidenceEvent, audience: AudienceType | 'me', permissions: PermissionSettings) {
 if (audience === 'me') return true;
 if (!permissions.evidence[audience] || !e.visibility.includes(audience)) return false;
 const categorySection: Record<string, ProfileSection> = { Work: 'work', 'Well-being': 'wellbeing', Family: 'family', Relationships: 'family', Community: 'community', Learning: 'growth', 'Current State': 'current-state', Financial: 'financial' };
 const section = categorySection[e.category];
 // Agreement receipts are individually selected evidence, independent of a financial assessment.
 return !section || permissions[section][audience];
}
