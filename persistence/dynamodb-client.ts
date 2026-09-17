import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoStore } from './dynamodb-store';

/** Credentials come exclusively from the standard server-side AWS provider chain. */
export function createDynamoStore({ tableName, region, endpoint }: { tableName: string; region: string; endpoint?: string }) {
 const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region, endpoint, maxAttempts: 3 }), {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
 });
 return new DynamoStore(client, tableName);
}
