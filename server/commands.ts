import { randomUUID } from 'node:crypto';
import type { ProfileCommand } from '../application/profile-service';
import type { AboutProfile, PermissionSettings } from '../types/profile';
import { initialAbout, initialPermissions } from '../data/profile-details';
import type { NewCommitment } from '../domain/commitments/types';
export class RequestError extends Error {}
function object(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Expected an object.');
 return value as Record<string, unknown>;
}
function string(value: unknown, max = 2000): string {
 if (typeof value !== 'string' || value.length > max) throw new RequestError('Invalid text field.');
 return value;
}
function strings(value: unknown): string[] {
 if (!Array.isArray(value) || value.length > 100) throw new RequestError('Invalid list.');
 return value.map(v => string(v));
}
export function parseCommand(value: unknown, experience: 'demo' | 'owner' = 'demo'): ProfileCommand {
 const body = object(value);
 if (body.type === 'profile') {
  const profile = object(body.profile), about = object(profile.about), permissions = object(profile.permissions);
  const cleanAbout = Object.fromEntries(Object.entries(initialAbout).map(([key, sample]) => [key, Array.isArray(sample) ? strings(about[key]) : string(about[key])])) as unknown as AboutProfile;
  const cleanPermissions = Object.fromEntries(Object.entries(initialPermissions).map(([key, sample]) => {
   const section = object(permissions[key]);
   return [key, Object.fromEntries(Object.keys(sample).map(audience => {
    if (typeof section[audience] !== 'boolean') throw new RequestError('Invalid permission.');
    return [audience, section[audience]];
   }))];
  })) as PermissionSettings;
  return { type: 'profile', profile: { about: cleanAbout, permissions: cleanPermissions } };
 }
 const id = string(body.id, 200);
 if (!id.trim()) throw new RequestError('Record ID is required.');
 const at = new Date().toISOString(); // Client clocks and owner identities are never authoritative.
 if (body.type === 'create') {
  const input = object(body.input);
  return { type: 'create', id, at, input: { title: string(input.title, 160), description: input.description === undefined ? undefined : string(input.description),
   category: string(input.category) as NewCommitment['category'], dueAt: input.dueAt === undefined ? undefined : string(input.dueAt, 100), visibility: strings(input.visibility) as NewCommitment['visibility'] } };
 }
 if (body.type === 'complete' || body.type === 'miss' || body.type === 'cancel') return { type: body.type, id, at };
 if (body.type === 'evidence') {
  const command = object(body.command), suppliedContext = object(body.context);
  const note = suppliedContext.note === undefined ? undefined : string(suppliedContext.note);
  const source = { type: 'external-source' as const, source: 'Independent reviewer (mock)', sourceId: 'demo-reviewer', demo: true };
  const context = { id: randomUUID(), at, note, actor: command.action === 'verified' ? source : { type: 'user' as const, source: experience === 'demo' ? 'Profile owner (demo)' : 'Profile owner', demo: experience === 'demo' } };
  if (command.action === 'verified') return { type: 'evidence', id, at, context, command: { action: 'verified', source } };
  if (command.action === 'corrected') {
   const changes = object(command.changes);
   if (Object.keys(changes).some(k => !['title', 'description'].includes(k))) throw new RequestError('Only evidence text may be corrected.');
   return { type: 'evidence', id, at, context, command: { action: 'corrected', changes: { title: changes.title === undefined ? undefined : string(changes.title, 160), description: changes.description === undefined ? undefined : string(changes.description) } } };
  }
  if (command.action === 'verification-requested' || command.action === 'disputed' || command.action === 'dispute-resolved' || command.action === 'revoked') return { type: 'evidence', id, at, context, command: { action: command.action } };
 }
 throw new RequestError('Unsupported action.');
}
