import type { ProfileState } from './repositories';
import type { AudienceType, ProfileSection, PermissionSettings } from '../types/profile';

/** Private accounts start empty and private, never with fictional demo history. */
export function emptyProfile(): ProfileState {
 const audiences: AudienceType[] = ['public', 'friend', 'neighbor', 'employer', 'landlord', 'family'];
 const sections: ProfileSection[] = ['about', 'current-state', 'wellbeing', 'reliability', 'work', 'community', 'family', 'evidence', 'financial', 'interests', 'growth', 'references'];
 return {
  about: { name: '', description: '', about: '', interests: [], goals: [], skills: [], values: [] },
  permissions: Object.fromEntries(sections.map(section => [section, Object.fromEntries(audiences.map(audience => [audience, false]))])) as PermissionSettings,
 };
}
