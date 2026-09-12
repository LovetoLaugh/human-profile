import type { RepositoryStore, Repositories, ProfileState } from './repositories';
import type { CommitmentAction, CommitmentState } from '../domain/commitments/pipeline';
import { applyCommitmentAction } from '../domain/commitments/pipeline';
import { reliabilityProfile } from '../domain/patterns/reliability-profile';
import { createCommitmentSeed } from '../data/mocks/commitments';
import { profileEvidence, initialAbout, initialPermissions } from '../data/profile-details';

export interface ProfileView { state: CommitmentState; profile: ProfileState; reliability: ReturnType<typeof reliabilityProfile> }
export type ProfileCommand = Exclude<CommitmentAction, { type: 'refresh-clock' }> | { type: 'profile'; profile: ProfileState };
export class ProfileService {
 constructor(private store: RepositoryStore, private now: () => string = () => new Date().toISOString()) {}
 private async initialize(ownerId: string, repositories: Repositories) {
  const profile = await repositories.profile.get(ownerId);
  if (profile) return;
  const commitments = await repositories.commitments.listForUser(ownerId);
  const evidence = await repositories.evidence.listForUser(ownerId);
  if (!commitments.length && !evidence.length) {
   // Reverse iteration preserves the existing fixture order with upsert repositories.
   for (const record of [...createCommitmentSeed().commitments].reverse()) await repositories.commitments.save({ ...record, ownerId });
   for (const record of [...profileEvidence].reverse()) await repositories.evidence.save({ ...record, ownerId });
  }
  await repositories.profile.save({ about: initialAbout, permissions: initialPermissions, ownerId });
 }
 private async view(ownerId: string, repositories: Repositories): Promise<ProfileView> {
  const state = { commitments: await repositories.commitments.listForUser(ownerId), evidence: await repositories.evidence.listForUser(ownerId), asOf: this.now() };
  const profile = (await repositories.profile.get(ownerId))!;
  return { state, profile, reliability: reliabilityProfile(state) };
 }
 read(ownerId: string) {
  return this.store.transaction(ownerId, async repositories => {
   await this.initialize(ownerId, repositories);
   return this.view(ownerId, repositories);
  });
 }
 execute(ownerId: string, command: ProfileCommand) {
  return this.store.transaction(ownerId, async repositories => {
   await this.initialize(ownerId, repositories);
   if (command.type === 'profile') await repositories.profile.save({ ...command.profile, ownerId });
   else {
    const previous = (await this.view(ownerId, repositories)).state;
    const at = this.now();
    const action = command.type === 'evidence' ? { ...command, at, context: { ...command.context, at } } : { ...command, at };
    const next = applyCommitmentAction(previous, action);
    for (const record of next.commitments) {
     if (previous.commitments.find(c => c.id === record.id) !== record) await repositories.commitments.save({ ...record, ownerId });
    }
    for (const record of next.evidence) {
     if (previous.evidence.find(e => e.id === record.id) !== record) await repositories.evidence.save({ ...record, ownerId });
    }
   }
   return this.view(ownerId, repositories);
  });
 }
}
