import type { RepositoryStore, Repositories } from './repositories';
import { matchesRecipient, projectShare, shareInput, shareState, ShareInputError, ShareUnavailableError, validShare, type RecipientIdentity, type Share, type SharedView } from '../domain/sharing/share';

export type RecipientResult = { status: 'accept' | 'expired' | 'revoked' } | { status: 'active'; view: SharedView };
export class SharingService {
 constructor(private store: RepositoryStore, private makeId: () => string, private now: () => string = () => new Date().toISOString()) {}
 private async previewIn(ownerId: string, repositories: Repositories, input: unknown) {
  const draft = shareInput(input, this.now());
  const profile = await repositories.profile.get(ownerId);
  if (!profile) throw new ShareInputError('Load your private profile before creating a share.');
  const view = projectShare(draft, await repositories.evidence.listForUser(ownerId), profile.permissions);
  if (view.evidence.length !== draft.evidenceIds.length) throw new ShareInputError('Every selected record must be eligible under its audience and category permissions. Refresh the selection.');
  return { draft, view };
 }
 preview(ownerId: string, input: unknown) {
  return this.store.transaction(ownerId, async r => (await this.previewIn(ownerId, r, input)).view);
 }
 create(ownerId: string, input: unknown) {
  return this.store.transaction(ownerId, async r => {
   const { draft, view } = await this.previewIn(ownerId, r, input);
   if ((await r.shares.listForUser(ownerId)).length >= 200) throw new ShareInputError('This profile has reached the v1 limit of 200 shares.');
   const id = this.makeId();
   if (await r.shares.getById(ownerId, id)) throw new ShareInputError('Could not create a new share. Reload and retry.');
   const share: Share = { ...draft, id, createdAt: this.now() };
   if (!validShare(share)) throw new ShareInputError('Choose a later expiration date.');
   await r.shares.save({ ...share, ownerId });
   return { id, view };
  });
 }
 list(ownerId: string) {
  return this.store.transaction(ownerId, async r => (await r.shares.listForUser(ownerId)).map(s => ({ id: s.id, purpose: s.purpose, audience: s.audience, recipientEmail: s.recipientEmail, expiresAt: s.expiresAt, createdAt: s.createdAt, status: shareState(s, this.now()), accepted: !!s.recipientSubject, selectedCount: s.evidenceIds.length })));
 }
 revoke(ownerId: string, id: string) {
  return this.store.transaction(ownerId, async r => {
   const share = await r.shares.getById(ownerId, id);
   if (!share || !validShare(share)) throw new ShareUnavailableError();
   if (!share.revokedAt) await r.shares.save({ ...share, revokedAt: this.now() });
   return { revoked: true };
  });
 }
 ownerPreview(ownerId: string, id: string) {
  return this.store.transaction(ownerId, async r => {
   const share = await r.shares.getById(ownerId, id);
   const profile = await r.profile.get(ownerId);
   if (!share || !validShare(share) || !profile) throw new ShareUnavailableError();
   const status = shareState(share, this.now());
   if (status !== 'active') return { status } as RecipientResult;
   return { status, view: projectShare(share, await r.evidence.listForUser(ownerId), profile.permissions) } as RecipientResult;
  });
 }
 /** URL identifiers locate a grant only; authenticated recipient matching is mandatory. */
 recipient(ownerId: string, id: string, identity: RecipientIdentity, accept = false): Promise<RecipientResult> {
  return this.store.transaction(ownerId, async r => {
   let share = await r.shares.getById(ownerId, id);
   if (!identity.subject || !share || !validShare(share) || !matchesRecipient(share, identity)) throw new ShareUnavailableError();
   const profile = await r.profile.get(ownerId);
   if (!profile) throw new ShareUnavailableError();
   const records = await r.evidence.listForUser(ownerId);
   const status = shareState(share, this.now());
   if (status !== 'active') return { status };
   if (!share.recipientSubject) {
    if (!accept) return { status: 'accept' };
    share = { ...share, recipientSubject: identity.subject, acceptedAt: this.now() };
    await r.shares.save(share);
   }
   return { status: 'active', view: projectShare(share, records, profile.permissions) };
  });
 }
}
