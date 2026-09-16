# Backend v1: local durable documents

This document describes the original development/demo backend. [Authentication & Profile Ownership v1](authentication-v1.md) adds the separate Clerk-protected `/me` and `/api/me/profile-state` path, empty owner initialization, and distinct owner storage without changing the demo repository.

The UI calls `GET`/`POST /api/profile-state`. Route handlers resolve the centralized development identity and parse commands. `ProfileService` reads repositories, invokes the existing domain reducer, saves changed records, and rebuilds the reliability read model. Domain code imports no storage or framework APIs. Evidence generation and audit transitions retain their existing semantics.

## Repository contract

`CommitmentRepository` and `EvidenceRepository` expose `getById(ownerId, id)`, `listForUser(ownerId)`, and `save(ownedRecord)`. `ProfileRepository` exposes `get(ownerId)` and `save(ownedProfile)`. `RepositoryStore.transaction(ownerId, callback)` provides these repositories scoped to one user. Cross-owner reads and writes within a transaction are rejected. Returned records are detached copies; modifications require explicit saves.

Ownership is an envelope field rather than a new domain business rule. Stored records have stable existing fixture IDs or client-generated UUIDs, and every record has `ownerId`. API commands cannot choose the owner. Server-generated timestamps and audit IDs are used on evidence transitions; independent verification is a clearly identified mock reviewer, never a browser-selected real verifier.

## Storage and atomicity

Default path: `.human-profile-data/dev-user-001.json`, relative to the repository root. A server-only `HUMAN_PROFILE_DATA_DIR` can override the directory, including for isolated manual validation. The version-1 document contains ownerId, revision, commitments, evidence (with embedded audit arrays), and profile (About and permission settings). No persisted reliability score is authoritative.

A per-user `.json.lock` directory serializes reads and writes across processes. A transaction loads one document, makes changes in detached memory, flushes a uniquely named temporary file, and renames it over the saved document. Domain errors or failures before publication leave the prior file intact. A response is returned only after the transaction publishes. Corrupt JSON, foreign ownership, and unsupported document versions fail closed rather than triggering reseeding. Temporary files from ordinary failed writes are cleaned up.

This adapter targets a local filesystem with atomic rename semantics, not shared/network filesystems or serverless ephemeral disks. It rewrites the entire user document and is not suitable for large production histories. It has no automatic schema migration or power-loss recovery protocol beyond file flushing and atomic publication. A failure after publication or an interrupted HTTP response may have committed the change: reload saved data before retrying. Create IDs remain stable during form retries; repeated commitment completion does not duplicate evidence. General command idempotency and version-conflict UI are future work.

## Seed, reset, and recovery

Initialization copies the existing fixtures only when a user has neither profile nor records. A profile marks initialization. If a partition already contains records but lacks a profile, initialization adds defaults without overwriting those records. An existing initialized empty profile is not reseeded.

Stop the server before running `npm run reset:data`. This archives the whole runtime directory to `.human-profile-data.backup-<timestamp>`; it does not delete the history. Restart and open the app to seed a new store. To restore, stop the server and move the desired backup back to the configured directory after preserving any current store. Default runtime and backup paths are gitignored; custom paths must also stay outside version control.

After a hard process crash, an orphaned `.json.lock` directory can block requests. The adapter times out and reports the lock instead of risking concurrent writes. Stop all servers using that directory and confirm no process is writing before removing only the orphaned lock. Preserve the JSON file. A full reset is a separate option that archives the records too.

## UI and derived state

The provider initially shows loading, then shares a confirmed snapshot across routes. Saves do not optimistically alter records. Errors appear globally and inside commitment/evidence dialogs; a reload control reads saved state. Polling every minute and on focus refreshes other-tab changes and the observation clock. About and permissions persist, while selected tabs, filters, dialogs, and preview audience remain presentation state.

Reliability is recalculated on the server using the current six-calendar-month window. Active/cancelled commitments and missing/disputed/revoked supporting evidence stay excluded. Resolving a dispute restores eligibility where appropriate. Evidence source types receive equal weight. The original fixture remains 50 on-time, 2 late, 1 missed: 94.34%, displayed as 94%, until fixture dates age out.

## Local development boundary and future direction

The app binds to loopback. Host/Origin validation rejects foreign origins, but this is not authentication: any local client can act as the shared development user. Audience views remain UI previews, not server authorization. Use mock/dev data only; no credentials or AWS configuration are needed.

The future DynamoDB adapter can use `PK = USER#<userId>` and `SK = PROFILE`, `COMMITMENT#<id>`, `EVIDENCE#<id>`. It must preserve atomic outcome/evidence writes, user isolation, and append-oriented audit semantics, using appropriate conditional writes and transactions. Embedded audit arrays may need separate records as they grow. DynamoDB is not implemented.

This is event-oriented persistence, not full event sourcing. Forms produce commands; domain transitions generate evidence and audit entries. Kafka, consumers, wearables, external verification APIs, and durable production persistence are not implemented. The public demo is deployed on Vercel; authentication now exists on the separate private owner path described above.

## Validation

`npm test` runs the original domain tests plus isolated repository/application tests using temporary directories and an in-memory adapter. Checks cover user isolation, save/read/update, recreation/reload, seed protection, reset backups, all commitment outcomes, evidence transitions/history, derived patterns, concurrent file-adapter instances, failed writes, transaction rollback, and request-boundary validation. Tests never use the developer’s runtime store.

Manual browser validation on September 12, 2026 used an isolated temporary data directory. A new commitment survived refresh, completion generated observed evidence, and the outcome/audit survived another refresh. A dispute remained excluded after refresh. Subsequent revocation and all audit entries survived a full server restart. Navigating to Home showed the original 53 eligible observations and 94% rate, excluding the revoked test record. The isolated validation records were not written to the default runtime store.
