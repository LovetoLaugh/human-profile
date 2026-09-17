# DynamoDB Production Persistence v1

The private `/me` application now has a durable DynamoDB adapter behind the existing repository contracts. No AWS resources are provisioned by this change. Anonymous demo repositories, Clerk authentication, domain transitions, and application workflows are unchanged. Live AWS persistence must be verified after manual deployment setup; automated tests inject a mocked DocumentClient and require no credentials.

## Runtime selection

| Environment | Private storage |
| --- | --- |
| `npm run dev`, no override | Existing local files in `.human-profile-data/owners` |
| Development, `HUMAN_PROFILE_OWNER_STORAGE=dynamodb` | DynamoDB |
| `VERCEL=1` or `NODE_ENV=production` (including `npm start`) | DynamoDB required |

`HUMAN_PROFILE_OWNER_STORAGE=file` is accepted only outside production. Unsupported settings fail clearly. Production never falls back to files or temporary memory. Configuration is resolved lazily after authentication; missing settings cannot break the anonymous demo or change private unauthenticated 401 responses. Missing table/region returns a private 503 configuration message; credential, network and AWS failures return a safe 503 without infrastructure details. No AWS settings are sent to the browser. A successful snapshot reports `owner-dynamodb` or `owner-local`, and `/me` shows the corresponding storage disclosure.

`HUMAN_PROFILE_MODE=public-demo` remains independent and controls only the anonymous application. Demo cookies and demo/development identities cannot select DynamoDB owner partitions. The old temporary-owner adapter is retained for its existing tests, but is no longer selected by the runtime.

## Table and ownership model

One regional table has a String partition key `PK` and String sort key `SK`. There are no indexes or separate permissions records.

| PK | SK | Data |
| --- | --- | --- |
| `USER#owner-<SHA-256(subject)>` | `PROFILE` | Owned About fields and permissions; initialization marker; partition revision |
| Same owner partition | `COMMITMENT#<id>` | Complete owned commitment, outcome and evidence links |
| Same owner partition | `EVIDENCE#<id>` | Complete owned Evidence v2 record, provenance, status and embedded audit history |

Each item has `schemaVersion: 1` and a `data` map containing the existing owned record. PROFILE has an integer `revision`. Other records have `orderRevision` and `orderIndex` to preserve application insertion order across updates. Optional undefined values are omitted; nulls and empty arrays survive serialization. Audit entries and stable IDs are preserved without flattening or truncation. Reliability is derived, never a stored authoritative score.

The existing server boundary derives `owner-<hash>` only from the verified `AuthenticatedIdentity.subject`. Hashing is stable storage encoding, not authentication. Email, request body/query fields and client headers cannot determine ownership. Every read is a partition-key Query or exact PROFILE Get; every stored envelope is checked against the owner. There are no scans or cross-owner queries. The AWS service principal can access the table, so application session checks remain the tenant authorization boundary.

## Atomicity, consistency and failure handling

A transaction reads PROFILE strongly consistently, queries all owner pages strongly consistently, then rereads PROFILE. Changed revisions cause at most three snapshot attempts before a reloadable conflict. Stable revisions fence paginated reads against writes from this adapter. All writers must obey this protocol; direct console writes and multi-region concurrent writers are outside this v1 guarantee.

The existing application callback runs against detached repositories. Changed records and an incremented PROFILE revision are published in one `TransactWriteCommand`. Completing a commitment therefore writes PROFILE, the commitment and its generated evidence together. Unchanged records are not rewritten. First initialization conditions PROFILE on absence; subsequent writes condition it on the loaded revision. Competing writers cannot silently overwrite one another: a failed revision condition returns HTTP 409 with reload guidance. The callback is not replayed after a failed write.

The SDK uses up to three attempts and one request token per transactional command. An ambiguous network response can mean the write committed: reload before retrying. The adapter does not replay an unknown outcome with a fresh token. This is not general HTTP command idempotency. Sequential form submissions based on old UI values are not merged; revision protection covers overlapping storage transactions, not a browser version/ETag contract.

No save is confirmed before the transactional write succeeds. Domain errors and rejected transactions publish no partial state. Corrupt ownership/schema/partitions fail closed without reseeding. Reads use the existing whole-owner repository contract and can become expensive as history grows.

The adapter rejects more than 100 changed items (PROFILE included), conservatively estimated items above 300 KiB, or aggregate writes above 3 MiB. This leaves headroom beneath DynamoDB's own limits; AWS remains the final validator. Oversized operations return 413 and never split transactions or discard audit entries. Embedded history can eventually prevent further changes to an evidence record. Separate audit items, bounded read models and a schema migration are future work. See [AWS transaction constraints and idempotency](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html) and [Query pagination](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html).

## Manual AWS setup

1. In the intended AWS account and region, create a DynamoDB table. Choose the exact name to put in `HUMAN_PROFILE_DYNAMODB_TABLE`, String partition key `PK`, String sort key `SK`, and on-demand billing. No secondary index, stream or TTL is required. Wait until the table is active. Configure backups/PITR and retention deliberately before real use.
2. Create a dedicated runtime role or principal with the following policy, replacing every placeholder with your actual region, account and table name. Do not use administrator permissions or share development and production tables.

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"],
       "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/<table-name>"
     }]
   }
   ```

   Transactional Put operations use the underlying `PutItem` permission; no separate `dynamodb:TransactWriteItems` IAM action is needed. The adapter does not need Scan, DeleteItem, CreateTable or index permissions. See [AWS transactional IAM permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html). Provisioning/backup administration uses a separate operator identity.
3. Configure the runtime's standard AWS SDK credential chain, preferably a supported role/federation mechanism. This change does not implement host federation. If your deployment uses environment credentials, securely configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and, for temporary credentials, `AWS_SESSION_TOKEN` and its renewal mechanism. Never expose these using `NEXT_PUBLIC_` or commit them.
4. Set server-only `AWS_REGION` and `HUMAN_PROFILE_DYNAMODB_TABLE` in Vercel for the intended environment. Production selects DynamoDB automatically. Preview deployments also have `VERCEL=1`; use a separate test table/principal there. Configure Clerk independently as described in [authentication setup](authentication-v1.md). Redeploy after configuration.
5. Sign in as a test owner: confirm an empty profile, edit About/permissions, create and complete a commitment, inspect its evidence, then reload and verify persistence from a fresh runtime. Sign in as a second owner and confirm isolation. Verify anonymous `/` still uses fictional demo data. Exercise denied IAM/missing settings in an isolated preview, not the active production table. These live checks are not claimed by the mocked test suite.

## Local development and optional emulator

No AWS setup is needed for ordinary `npm run dev`; existing private files are preserved. To explicitly use DynamoDB, set `HUMAN_PROFILE_OWNER_STORAGE=dynamodb`, `AWS_REGION`, and `HUMAN_PROFILE_DYNAMODB_TABLE` in an ignored local environment file and provide your own development credentials through the standard SDK chain.

For an independently installed DynamoDB Local instance, optionally set `HUMAN_PROFILE_DYNAMODB_ENDPOINT=http://localhost:8000`, provide its required local credential configuration yourself, and manually create the same PK/SK table. Only loopback endpoints are accepted in development; endpoint overrides are rejected on Vercel and in production. This change neither installs nor starts an emulator and includes no sample secret values. Restart after changing environment settings. `.env.example` lists names only.

## Migration, operations and future work

There is no automatic import of local private files and never an import of anonymous demo fixtures. Existing local files remain available by returning to local development mode. Before a future private-file migration, stop writes, back up both stores, verify the original authenticated subject mapping, validate schema/ownership/IDs/audit history, import in controlled atomic batches and reconcile counts and derived results before switching traffic. A Clerk development-to-production subject change requires explicit ownership mapping; email is not an automatic migration key. No migration utility is included.

Account deletion, retention/export policy, monitoring, backup restore drills and large-history/schema migrations remain operational work. `npm run reset:data` archives local files only and cannot delete DynamoDB data. Audit history is append-oriented application data, not tamper-proof event sourcing. Kafka could later carry asynchronous events; it is not implemented and would not replace DynamoDB as the authoritative profile store.

## Verification and implementation inventory

The suite has 120 passing tests: the previous 99 plus 21 DynamoDB tests covering owner/key construction, empty initialization, serialization/pagination, atomic outcome/evidence saves, audit transitions, rollback, concurrent writes and initialization, ambiguous committed responses, snapshot retry, cross-owner spoofing, corrupt partitions, size limits, runtime configuration, safe API errors, demo isolation and dependency boundaries. The transport is mocked: no real AWS credentials, tables or external AWS calls are needed. Live AWS deployment remains unverified.

Created: `persistence/dynamodb-store.ts`, `persistence/dynamodb-client.ts`, `server/owner-storage-configuration.ts`, `tests/dynamodb.test.cjs`, `tests/helpers/fake-dynamodb.cjs`, and this guide.

Modified: `server/owner-backend.ts`, `server/owner-http.ts`, `app/api/me/profile-state/route.ts`, `components/commitments/CommitmentProvider.tsx`, `components/owner/OwnerProfile.tsx`, `app/(account)/sign-in/[[...sign-in]]/page.tsx`, `tests/authentication.test.cjs`, `tests/helpers/load-typescript.cjs`, `package.json`, `package-lock.json`, `.env.example`, `README.md`, `docs/backend-v1.md`, and `docs/authentication-v1.md`.

No domain/application, middleware, public demo repository, public API or public runtime-selection changes are required.

Local validation completed: **120/120 tests**, lint, TypeScript, production build and `git diff --check` passed. Production preview in public-demo mode returned HTTP 200 with meaningful intro copy outside scripts and exactly one intro. Browser checks passed for the demo profile CTA, permissions, View As, commitment creation/completion, evidence audit and simulated verification request. Signed-out `/me` redirected to sign-in, Clerk's Google UI rendered, and private GET/POST with forged owner fields returned 401/no-store. Desktop/tablet/mobile showed no horizontal overflow. No real AWS resources were created or exercised; `.env` credentials were not changed or exposed.

The port-3002 production-preview log also emitted two Clerk session-refresh redirect warnings during signed-out checks. The checked routes still returned the expected results and the Google UI rendered, but this run did not repeat a real OAuth round trip. Authentication configuration was left unchanged; any persistent session-refresh warning should be investigated separately from DynamoDB setup.
