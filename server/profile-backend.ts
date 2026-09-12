import { resolve } from 'node:path';
import { FileStore } from '../persistence/file-store';
import { ProfileService } from '../application/profile-service';
// Server-only entry point: imported exclusively by route handlers.
export const localDataDirectory = resolve(process.env.HUMAN_PROFILE_DATA_DIR || '.human-profile-data');
export const profileService = new ProfileService(new FileStore(localDataDirectory));
