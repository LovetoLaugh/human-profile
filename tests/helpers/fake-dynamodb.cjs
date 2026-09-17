const assert = require('node:assert/strict');
const { GetCommand, QueryCommand, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const copy = value => value === undefined ? undefined : structuredClone(value);
const key = item => `${item.PK}\0${item.SK}`;
function cancelled() {
 return Object.assign(new Error('Revision check failed'), { name: 'TransactionCanceledException', CancellationReasons: [{ Code: 'ConditionalCheckFailed' }] });
}
class FakeDynamoClient {
 items = new Map();
 commands = [];
 pageSize = 1000;
 beforeTransact;
 afterQuery;
 failure;
 failAfterCommit = false;
 async send(command) {
  const input = copy(command.input);
  this.commands.push({ name: command.constructor.name, input });
  if (command instanceof GetCommand) {
   assert.equal(input.ConsistentRead, true);
   return { Item: copy(this.items.get(key(input.Key))) };
  }
  if (command instanceof QueryCommand) {
   assert.equal(input.ConsistentRead, true);
   assert.equal(input.KeyConditionExpression, '#pk = :owner');
   const all = [...this.items.values()].filter(item => item.PK === input.ExpressionAttributeValues[':owner']).sort((a,b)=>a.SK.localeCompare(b.SK));
   const start = input.ExclusiveStartKey ? all.findIndex(item => key(item) === key(input.ExclusiveStartKey)) + 1 : 0;
   const items = all.slice(start, start + this.pageSize);
   const last = items.at(-1);
   const result = { Items: copy(items), ...(start + items.length < all.length ? { LastEvaluatedKey: { PK: last.PK, SK: last.SK } } : {}) };
   if (this.afterQuery) await this.afterQuery(input);
   return result;
  }
  if (command instanceof TransactWriteCommand) {
   assert.ok(input.ClientRequestToken);
   if (this.beforeTransact) await this.beforeTransact(input);
   if (this.failure) throw this.failure;
   const first = input.TransactItems[0].Put;
   const current = this.items.get(key(first.Item));
   if (first.ConditionExpression === 'attribute_not_exists(#pk)' ? !!current : current?.revision !== first.ExpressionAttributeValues[':expected']) throw cancelled();
   const next = new Map(this.items);
   for (const { Put } of input.TransactItems) next.set(key(Put.Item), copy(Put.Item));
   this.items = next;
   if (this.failAfterCommit) throw new Error('Response lost after commit');
   return {};
  }
  throw new Error(`Unsupported AWS command ${command.constructor.name}`);
 }
 writes() { return this.commands.filter(c => c.name === 'TransactWriteCommand'); }
}
module.exports = { FakeDynamoClient, key, cancelled };
