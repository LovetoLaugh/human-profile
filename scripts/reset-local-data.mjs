import { rename } from 'node:fs/promises';
import { resolve } from 'node:path';
// Stop the server first. Preserve a recoverable backup rather than deleting runtime records.
const directory = resolve(process.env.HUMAN_PROFILE_DATA_DIR || '.human-profile-data');
try {
 const backup = `${directory}.backup-${Date.now()}`;
 await rename(directory, backup);
 console.log(`Local data moved to ${backup}. The next request will seed fresh mock data.`);
} catch (error) {
 if (error.code === 'ENOENT') console.log('No local data exists; the next request will seed it.');
 else throw error;
}
