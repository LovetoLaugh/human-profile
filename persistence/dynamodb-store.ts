import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { GetCommand, QueryCommand, TransactWriteCommand, type DynamoDBDocumentClient, type TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import type { Repositories, RepositoryStore, UserDocument, Owned, ProfileState } from '../application/repositories';
import type { Commitment } from '../domain/commitments/types';
import type { EvidenceEvent } from '../types/profile';
import { clone, emptyDocument, repositoriesFor } from './document-repositories';

export class DynamoConflictError extends Error {}
export class DynamoIntegrityError extends Error {}
export class DynamoLimitError extends Error {}
export type DynamoItem = Record<string, unknown> & { PK: string; SK: string; schemaVersion: 1; data: Record<string, unknown>; revision?: number; orderRevision?: number; orderIndex?: number };
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)])) : value;
const json = (value: unknown) => JSON.stringify(canonical(value));
const clean = <T>(value: T): T => JSON.parse(json(value)) as T; // Omit optional undefined fields; preserve null and empty lists.
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function ownerPartition(ownerId: string) {
 // Only server-derived private ownership keys. Demo/development identities cannot enter this table.
 if (!/^owner-[a-f0-9]{64}$/.test(ownerId)) throw new DynamoIntegrityError('Invalid private owner key.');
 return `USER#${ownerId}`;
}
export function entityKey(ownerId: string, kind: 'PROFILE' | 'COMMITMENT' | 'EVIDENCE', id?: string) {
 if (kind !== 'PROFILE' && (!id || Buffer.byteLength(id, 'utf8') > 900)) throw new DynamoIntegrityError('Invalid record key.');
 return { PK: ownerPartition(ownerId), SK: kind === 'PROFILE' ? kind : `${kind}#${id}` };
}
function validateItem(value: unknown, ownerId: string): DynamoItem {
 if (!object(value) || value.PK !== ownerPartition(ownerId) || value.schemaVersion !== 1 || !object(value.data) || value.data.ownerId !== ownerId || typeof value.SK !== 'string') {
  throw new DynamoIntegrityError('Invalid stored ownership or schema.');
 }
 if (value.SK === 'PROFILE') {
  if (!integer(value.revision) || value.revision < 1 || !object(value.data.about) || !object(value.data.permissions)) throw new DynamoIntegrityError('Invalid stored profile.');
 } else {
  const kind = value.SK.startsWith('COMMITMENT#') ? 'COMMITMENT' : value.SK.startsWith('EVIDENCE#') ? 'EVIDENCE' : null;
  if (!kind || typeof value.data.id !== 'string' || entityKey(ownerId, kind, value.data.id).SK !== value.SK || !integer(value.orderRevision) || value.orderRevision < 1 || !integer(value.orderIndex)) throw new DynamoIntegrityError('Invalid stored record.');
  if (kind === 'COMMITMENT' && (!Array.isArray(value.data.evidenceIds) || typeof value.data.status !== 'string')) throw new DynamoIntegrityError('Invalid stored commitment.');
  if (kind === 'EVIDENCE' && !Array.isArray(value.data.auditHistory)) throw new DynamoIntegrityError('Invalid stored evidence.');
 }
 return value as DynamoItem;
}
// DynamoDB nested map/list overhead plus conservative numeric width (up to 38 digits).
function itemBytes(value: unknown): number {
 if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
 if (typeof value === 'number') return 21;
 if (typeof value === 'boolean' || value === null) return 1;
 if (Array.isArray(value)) return 3 + value.reduce((sum, entry) => sum + 1 + itemBytes(entry), 0);
 if (object(value)) return 3 + Object.entries(value).reduce((sum, [key, entry]) => sum + 1 + Buffer.byteLength(key, 'utf8') + itemBytes(entry), 0);
 throw new DynamoIntegrityError('Unsupported stored value.');
}
/** Distinguish a confirmed failed revision check from an ambiguous network failure. */
function conditionalConflict(error: unknown) {
 if (!object(error) || error.name !== 'TransactionCanceledException' || !Array.isArray(error.CancellationReasons)) return false;
 const reasons = error.CancellationReasons as { Code?: string }[];
 return reasons[0]?.Code === 'ConditionalCheckFailed' && reasons.slice(1).every(reason => !reason.Code || reason.Code === 'None');
}

/** Whole-owner transactions backed by one conditional DynamoDB transactional write. */
export class DynamoStore implements RepositoryStore {
 constructor(private client: Pick<DynamoDBDocumentClient, 'send'>, private tableName: string, private attempts = 3) {}
 private async profile(ownerId: string) {
  const result = await this.client.send(new GetCommand({ TableName: this.tableName, Key: entityKey(ownerId, 'PROFILE'), ConsistentRead: true }));
  if (!result.Item) return undefined;
  const item = validateItem(result.Item, ownerId);
  if (item.SK !== 'PROFILE') throw new DynamoIntegrityError('Invalid profile key.');
  return item;
 }
 private async snapshot(ownerId: string) {
  const first = await this.profile(ownerId);
  const items: DynamoItem[] = [];
  const seen = new Set<string>();
  let cursor: Record<string, unknown> | undefined;
  do {
   const page = await this.client.send(new QueryCommand({ TableName: this.tableName, KeyConditionExpression: '#pk = :owner', ExpressionAttributeNames: { '#pk': 'PK' }, ExpressionAttributeValues: { ':owner': ownerPartition(ownerId) }, ConsistentRead: true, ExclusiveStartKey: cursor }));
   for (const value of page.Items ?? []) items.push(validateItem(value, ownerId));
   cursor = page.LastEvaluatedKey;
   if (cursor) {
    if (cursor.PK !== ownerPartition(ownerId) || typeof cursor.SK !== 'string' || seen.has(json(cursor))) throw new DynamoIntegrityError('Invalid query cursor.');
    seen.add(json(cursor));
   }
  } while (cursor);
  const last = await this.profile(ownerId);
  if (first?.revision !== last?.revision) throw new DynamoConflictError('Profile changed while loading.');
  const profiles = items.filter(item => item.SK === 'PROFILE');
  if (profiles.length !== (first ? 1 : 0) || (first && json(profiles[0]) !== json(first)) || (!first && items.length)) throw new DynamoIntegrityError('Inconsistent owner partition.');
  if (new Set(items.map(item => item.SK)).size !== items.length) throw new DynamoIntegrityError('Duplicate stored record.');
  const document = emptyDocument(ownerId);
  document.revision = first?.revision ?? 0;
  if (first) document.profile = clone(first.data) as unknown as Owned<ProfileState>;
  const records = items.filter(item => item.SK !== 'PROFILE');
  if (records.some(item => item.orderRevision! > document.revision)) throw new DynamoIntegrityError('Invalid record revision.');
  records.sort((a, b) => b.orderRevision! - a.orderRevision! || a.orderIndex! - b.orderIndex! || a.SK.localeCompare(b.SK));
  document.commitments = records.filter(item => item.SK.startsWith('COMMITMENT#')).map(item => clone(item.data) as unknown as Owned<Commitment>);
  document.evidence = records.filter(item => item.SK.startsWith('EVIDENCE#')).map(item => clone(item.data) as unknown as Owned<EvidenceEvent>);
  return { document, items };
 }
 private writes(document: UserDocument, previous: DynamoItem[]) {
  if (!document.profile || !Number.isSafeInteger(document.revision + 1)) throw new DynamoIntegrityError('A valid profile is required for durable writes.');
  const revision = document.revision + 1;
  const old = new Map(previous.map(item => [item.SK, item]));
  const profile: DynamoItem = clean({ ...entityKey(document.ownerId, 'PROFILE'), schemaVersion: 1, revision, data: document.profile as unknown as Record<string, unknown> });
  const changes: DynamoItem[] = [profile];
  for (const [kind, records] of [['COMMITMENT', document.commitments], ['EVIDENCE', document.evidence]] as const) {
   records.forEach((record, index) => {
    const key = entityKey(document.ownerId, kind, record.id);
    const existing = old.get(key.SK);
    if (existing && json(existing.data) === json(clean(record))) return;
    changes.push(clean({ ...key, schemaVersion: 1, data: record as unknown as Record<string, unknown>, orderRevision: existing?.orderRevision ?? revision, orderIndex: existing?.orderIndex ?? index }));
   });
  }
  // Never split a logical transaction into batches or truncate embedded audit history.
  if (changes.length > 100) throw new DynamoLimitError('Too many records changed in one transaction.');
  let total = 0;
  for (const item of changes) {
   validateItem(item, document.ownerId);
   // Conservative structural size estimate with headroom below DynamoDB's 400 KB/4 MB limits.
   const size = itemBytes(item);
   if (size > 300 * 1024) throw new DynamoLimitError('A record or its audit history exceeds the supported size.');
   total += size;
  }
  if (total > 3 * 1024 * 1024) throw new DynamoLimitError('The transaction exceeds the supported size.');
  return changes.map(Item => {
   const Put: NonNullable<NonNullable<TransactWriteCommandInput['TransactItems']>[number]['Put']> = { TableName: this.tableName, Item };
   if (Item.SK === 'PROFILE') {
    if (document.revision === 0) {
     Put.ConditionExpression = 'attribute_not_exists(#pk)';
     Put.ExpressionAttributeNames = { '#pk': 'PK' };
    } else {
     Put.ConditionExpression = '#revision = :expected';
     Put.ExpressionAttributeNames = { '#revision': 'revision' };
     Put.ExpressionAttributeValues = { ':expected': document.revision };
    }
   }
   return { Put };
  });
 }
 async transaction<T>(ownerId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
  ownerPartition(ownerId);
  for (let attempt = 0; attempt < this.attempts; attempt++) {
   let snapshot;
   try { snapshot = await this.snapshot(ownerId); }
   catch (error) { if (error instanceof DynamoConflictError) continue; throw error; }
   const { document, items } = snapshot;
   const before = json(document);
   const result = await work(repositoriesFor(document));
   if (json(document) === before) return result;
   const TransactItems = this.writes(document, items);
   try {
    await this.client.send(new TransactWriteCommand({ TransactItems, ClientRequestToken: randomUUID() }));
    return result;
   } catch (error) {
    // SDK retries reuse this command/token. An unknown outcome must surface, never replay under a fresh token.
    if (conditionalConflict(error)) throw new DynamoConflictError('Your profile changed concurrently. Reload and try again.');
    throw error;
   }
  }
  throw new DynamoConflictError('Your profile changed concurrently. Reload and try again.');
 }
}
