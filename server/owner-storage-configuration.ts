import type { RuntimeEnvironment } from './runtime-mode';
export type OwnerStorageMode = 'local' | 'dynamodb';
export class OwnerStorageConfigurationError extends Error {}
export function ownerStorageMode(environment: RuntimeEnvironment): OwnerStorageMode {
 const selected = environment.HUMAN_PROFILE_OWNER_STORAGE;
 if (selected && selected !== 'dynamodb' && selected !== 'file') throw new OwnerStorageConfigurationError('Unsupported private storage configuration.');
 const production = environment.VERCEL === '1' || environment.NODE_ENV === 'production';
 if (production && selected === 'file') throw new OwnerStorageConfigurationError('Production private profiles require DynamoDB.');
 return production || selected === 'dynamodb' ? 'dynamodb' : 'local';
}
export function dynamoConfiguration(environment: RuntimeEnvironment) {
 const tableName = environment.HUMAN_PROFILE_DYNAMODB_TABLE?.trim();
 const region = environment.AWS_REGION?.trim();
 if (!tableName || !region) throw new OwnerStorageConfigurationError('Private profile storage requires HUMAN_PROFILE_DYNAMODB_TABLE and AWS_REGION.');
 if (!/^[a-zA-Z0-9_.-]{3,255}$/.test(tableName)) throw new OwnerStorageConfigurationError('Invalid DynamoDB table configuration.');
 const endpoint = environment.HUMAN_PROFILE_DYNAMODB_ENDPOINT?.trim() || undefined;
 if (endpoint) {
  if (environment.VERCEL === '1' || environment.NODE_ENV === 'production') throw new OwnerStorageConfigurationError('A local DynamoDB endpoint is not allowed in production.');
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new OwnerStorageConfigurationError('Invalid local DynamoDB endpoint.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new OwnerStorageConfigurationError('DynamoDB testing endpoints must use loopback.');
 }
 return { tableName, region, endpoint };
}
