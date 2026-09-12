import type { Commitment } from '../domain/commitments/types';
import type { EvidenceEvent, AboutProfile, PermissionSettings } from '../types/profile';

// Ownership belongs to persistence envelopes, leaving domain records storage-agnostic.
export type Owned<T> = T & { ownerId: string };
export interface ProfileState { about: AboutProfile; permissions: PermissionSettings }
export interface RecordRepository<T extends { id: string }> {
 getById(ownerId: string, id: string): Promise<Owned<T> | undefined>;
 listForUser(ownerId: string): Promise<Owned<T>[]>;
 save(record: Owned<T>): Promise<void>;
}
export type CommitmentRepository = RecordRepository<Commitment>;
export type EvidenceRepository = RecordRepository<EvidenceEvent>;
export interface ProfileRepository {
 get(ownerId: string): Promise<Owned<ProfileState> | undefined>;
 save(profile: Owned<ProfileState>): Promise<void>;
}
export interface Repositories {
 commitments: CommitmentRepository;
 evidence: EvidenceRepository;
 profile: ProfileRepository;
}
export interface UserDocument {
 version: 1;
 ownerId: string;
 revision: number;
 commitments: Owned<Commitment>[];
 evidence: Owned<EvidenceEvent>[];
 profile?: Owned<ProfileState>;
}
/** A transaction must publish all writes together or none. Callbacks cannot escape their user partition. */
export interface RepositoryStore {
 transaction<T>(ownerId: string, work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
