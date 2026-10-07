import type { AudienceType, EvidenceEvent, PermissionSettings } from '../../types/profile';
import { canSeeEvidence } from '../evidence/visibility';

export const shareAudiences: AudienceType[] = ['friend', 'neighbor', 'employer', 'landlord', 'family'];
export interface Share {
 id: string;
 purpose: string;
 audience: AudienceType;
 evidenceIds: string[];
 recipientEmail: string;
 createdAt: string;
 expiresAt: string;
 recipientSubject?: string;
 acceptedAt?: string;
 revokedAt?: string;
}
export interface ShareInput { purpose: string; audience: AudienceType; evidenceIds: string[]; recipientEmail: string; expiresAt: string }
export interface RecipientIdentity { subject: string; verifiedEmails: readonly string[] }
export type SharedEvidence = Pick<EvidenceEvent, 'id' | 'title' | 'description' | 'sourceType' | 'verificationStatus' | 'timestamp' | 'createdAt'>;
export interface SharedView { purpose: string; audience: AudienceType; expiresAt: string; evidence: SharedEvidence[] }
export class ShareInputError extends Error {}
export class ShareUnavailableError extends Error {}
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function shareInput(value: unknown, now: string): ShareInput {
 const v = value as Partial<ShareInput> | null;
 if (!v || typeof v !== 'object' || typeof v.purpose !== 'string' || !v.purpose.trim() || v.purpose.trim().length > 120 || !shareAudiences.includes(v.audience!)) throw new ShareInputError('Enter a purpose and choose an audience.');
 if (typeof v.recipientEmail !== 'string' || v.recipientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.recipientEmail.trim())) throw new ShareInputError('Enter the intended recipient’s email address.');
 if (!Array.isArray(v.evidenceIds) || v.evidenceIds.length < 1 || v.evidenceIds.length > 50 || v.evidenceIds.some(id => typeof id !== 'string' || !id || id.length > 300) || new Set(v.evidenceIds).size !== v.evidenceIds.length) throw new ShareInputError('Select between 1 and 50 different evidence records.');
 if (typeof v.expiresAt !== 'string' || !Number.isFinite(Date.parse(v.expiresAt)) || Date.parse(v.expiresAt) <= Date.parse(now)) throw new ShareInputError('Choose a future expiration date.');
 return { purpose: v.purpose.trim(), audience: v.audience!, recipientEmail: normalizeEmail(v.recipientEmail), evidenceIds: [...v.evidenceIds], expiresAt: new Date(v.expiresAt).toISOString() };
}
export function isEligible(e: EvidenceEvent, audience: AudienceType, permissions: PermissionSettings) {
 return e.verificationStatus !== 'disputed' && e.verificationStatus !== 'revoked' && canSeeEvidence(e, audience, permissions);
}
/** Deliberate output allowlist. Never spread an owned record into a recipient DTO. */
export function projectShare(share: Pick<Share, 'purpose' | 'audience' | 'expiresAt' | 'evidenceIds'>, records: EvidenceEvent[], permissions: PermissionSettings): SharedView {
 const selected = new Set(share.evidenceIds);
 return { purpose: share.purpose, audience: share.audience, expiresAt: share.expiresAt, evidence: records.filter(e => selected.has(e.id) && isEligible(e, share.audience, permissions)).map(e => ({ id: e.id, title: e.title, description: e.description, sourceType: e.sourceType, verificationStatus: e.verificationStatus, timestamp: e.timestamp, createdAt: e.createdAt })) };
}
export function matchesRecipient(share: Share, identity: RecipientIdentity) {
 return share.recipientSubject ? share.recipientSubject === identity.subject : identity.verifiedEmails.some(email => normalizeEmail(email) === share.recipientEmail);
}
export function shareState(share: Share, now: string): 'active' | 'expired' | 'revoked' {
 if (share.revokedAt) return 'revoked';
 return Date.parse(share.expiresAt) <= Date.parse(now) ? 'expired' : 'active';
}
/** Fail closed if persisted grant data is malformed. */
export function validShare(value: unknown): value is Share {
 const s = value as Share;
 if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id || typeof s.createdAt !== 'string' || !Number.isFinite(Date.parse(s.createdAt))) return false;
 try { shareInput(s, s.createdAt); } catch { return false; }
 return s.recipientEmail === normalizeEmail(s.recipientEmail) && (s.recipientSubject === undefined || (typeof s.recipientSubject === 'string' && !!s.recipientSubject)) && (s.acceptedAt === undefined || (typeof s.acceptedAt === 'string' && Number.isFinite(Date.parse(s.acceptedAt)))) && (!!s.recipientSubject === !!s.acceptedAt) && (s.revokedAt === undefined || (typeof s.revokedAt === 'string' && Number.isFinite(Date.parse(s.revokedAt))));
}
