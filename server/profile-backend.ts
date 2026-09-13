import { ProfileService } from '../application/profile-service';
import { selectRepository } from './repository-selection';
import { runtimeMode } from './runtime-mode';
export const mode = runtimeMode(process.env);
let backend: Promise<ProfileService> | undefined;
// Simulated dates keep fixed demo fixtures useful beyond their original six-month window.
const demoStartedAt = Date.now();
export const demoDate = '2026-09-12T12:00:00.000Z';
export function getProfileService() {
 backend ??= selectRepository(process.env).then(store => new ProfileService(store,
  mode === 'public-demo' ? () => new Date(Date.parse(demoDate) + Date.now() - demoStartedAt).toISOString() : undefined));
 return backend;
}
