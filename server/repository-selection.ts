import type { RepositoryStore } from '../application/repositories';
import type { RuntimeEnvironment } from './runtime-mode';
import { runtimeMode } from './runtime-mode';
import { DemoStore } from '../persistence/demo-store';
/** Lazy file import ensures public requests neither load runtime JSON nor initialize filesystem storage. */
export async function selectRepository(environment: RuntimeEnvironment): Promise<RepositoryStore> {
 if (runtimeMode(environment) === 'public-demo') return new DemoStore();
 const { FileStore } = await import('../persistence/file-store');
 return new FileStore(environment.HUMAN_PROFILE_DATA_DIR || '.human-profile-data');
}
