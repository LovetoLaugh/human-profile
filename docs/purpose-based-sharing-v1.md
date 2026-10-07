# Purpose-Based Sharing v1

Signed-in owners can invite a particular recipient to read an explicitly selected set of evidence for a stated purpose. The anonymous Alex Morgan demo retains its simulated audience previews; they create no real grants. There are no scores, rankings, inferred character judgments, shared metrics or shared pattern summaries in v1.

## Workflow and disclosure

On `/me`, configure the existing audience permissions, then choose a purpose label, intended recipient email, audience, expiration date/time and 1–50 evidence records. The audience connects a share to the existing permission matrix; a purpose label alone is not authorization. Both the Evidence permission and any relevant category permission must allow that audience, and each record must individually include it in its visibility. Disputed and revoked evidence are excluded. Commitment creation already supports choosing its audience; records with no permitted audience cannot be shared.

Preview calls the server and displays the same DTO/component used by the recipient. Creation rechecks the selection and permissions rather than trusting the earlier preview. Copy the generated invitation link and send it yourself: no email provider or automatic sending is added. The owner can list, inspect the current recipient view and revoke shares. Expired shares require a new invitation; editing a grant's recipient, selection or expiry is deliberately not supported.

The recipient signs in, verifies access and explicitly accepts. Only an invited account can see an acceptance prompt. Acceptance permanently binds the grant to that verified authentication subject. The page is read-only and has states for sign-in required, unavailable access, acceptance, empty current selection, expiry, revocation and failed requests. Changing accounts remounts the recipient view; refresh failures clear previously displayed evidence. Open pages recheck every 30 seconds and on focus, with a local expiration timer. Every server read independently enforces current permissions, expiry and revocation. Revocation stops future access; it cannot erase copies or responses already received by a recipient.

A share's evidence-ID allowlist is fixed. New records never join automatically. Permitted records show their current text/classification/status. Records removed from permission scope, deleted, disputed or revoked disappear on the next read. Restoring eligibility can make an originally selected record visible again; this never adds a new ID. Owners should review free-text titles/descriptions because those fields are intentionally shared.

## Identity and access model

Clerk remains at the server boundary. Owner mutations and listing use only `privateOwnerKey(verified subject)`, ignoring browser ownership fields. Recipients must have a verified Clerk session. The server fetches the current Clerk user, checks that its ID matches the verified session subject, and uses only email addresses whose verification status is `verified`. No browser-supplied email, identity, claims or recipient subject are accepted as proof.

Before acceptance, the intended email is matched case-insensitively after trimming whitespace; no plus-address or provider-specific alias collapsing occurs. After acceptance, authorization is by subject exclusively; adding the same address to another account cannot transfer the grant. Email invitations inherently mean the account controlling that verified address at acceptance, including shared mailboxes or reassigned addresses. The first successful acceptance wins; changes of Clerk instance/subject require a new invitation. An unverified email cannot accept. A recipient email can be stored before a Clerk account exists.

Invitation URLs have the form `/shared/owner-<subject hash>/<random UUID>`. These are identifiers, **not bearer capabilities or secret tokens**. Knowing a link, altering its owner segment, or forwarding it does not authorize a read. No token table or raw token storage is needed. Recipient lookup uses the URL only to locate a grant; it must then satisfy the verified identity check before any projection or acceptance. Unknown shares, wrong accounts and unverified recipients get the same unavailable response. Expired/revoked status is disclosed only to a matching recipient (or the owner). Purpose, email, owner profile and evidence are not included in unauthorized responses.

Only these evidence fields leave the recipient API: `id`, `title`, `description`, `sourceType`, `verificationStatus`, `timestamp`, `createdAt`. The enclosing view has `purpose`, `audience`, `expiresAt`, and the filtered evidence list. There are no audit notes/history, source identifiers, verification actors, commitment objects/metadata, owner IDs, recipient emails/subjects, About fields, permissions, reliability calculations or unrelated records in that DTO. The owner preview returns exactly the same view shape.

Shared pages are dynamic generic shells; they contain no private evidence in initial HTML or RSC props. Evidence is fetched from the authenticated recipient API with `cache: no-store`. Page/API responses use private no-store caching, noindex/nofollow/noarchive and no-referrer headers. Metadata is generic. API responses vary by Cookie/Authorization. Same-origin and cross-site checks also protect acceptance and owner mutations. These policies supplement, rather than replace, server authorization. Invitation sign-in returns accept only an exact local sharing path, otherwise defaulting to `/me`.

## Architecture and access patterns

- `domain/sharing/share.ts`: input rules, status/recipient rules and the explicit projection allowlist.
- `domain/evidence/visibility.ts`: existing pure audience visibility function, also re-exported for the unchanged demo previews.
- `application/sharing-service.ts`: preview/create/list/inspect/revoke and recipient read/accept workflows using the existing owner-scoped transaction contract.
- `server/recipient-identity.ts`, `server/clerk-identity.ts`: trusted verified-recipient mapping and Clerk integration.
- `server/sharing-http.ts`: authenticated request handling, server-derived owner keys, safe statuses and response policies.
- `server/sharing-backend.ts`: the same centralized private store selection as existing profile persistence.
- Owner routes: `GET /api/me/shares`; `POST /api/me/shares` with preview/create/inspect/revoke actions.
- Recipient routes: `GET /api/shared/[ownerId]/[shareId]`; `POST` only for acceptance. Other mutations are not supported.

`Repositories.shares` uses the same get/list/save contract as existing records. ProfileService responses do not include grants. Domain/application code imports neither Clerk nor AWS. The server may read a whole owner snapshot internally to honor the current repository contract, but only the permitted projection is returned to recipients.

## Storage, atomicity and concurrency

The existing table now also stores `PK=USER#owner-<SHA-256(subject)>`, `SK=SHARE#<uuid>`. Its version-1 envelope contains owned grant data plus the existing order fields. Grant data contains purpose, audience, selected evidence IDs, intended email, creation/expiry dates, optional accepted subject/time and optional revocation time. PROFILE remains the owner partition revision fence. There are no new partitions, global indexes, tables or scans.

Access patterns are owner-scoped listing/get, exact grant lookup within the located owner's transaction, and current selected-evidence/permission reads. DynamoDB continues to perform paginated strongly consistent owner Queries fenced by strongly consistent PROFILE reads. Create, accept and revoke each write the changed SHARE and conditional PROFILE revision in one transaction. A stale acceptance cannot overwrite a winning revocation or another acceptance. A permission update winning against share creation invalidates that stale create. Conflicts return 409/reload guidance rather than replaying callbacks. Already in-flight reads can finish against the snapshot they authorized; revocation cannot retract an already authorized response.

Local FileStore uses its existing per-owner lock and atomic document rename. Old files with no `shares` array mean no grants; the field is added on the first share save. MemoryStore also supports the extended contract for isolated tests. No existing file or production data migration was run. DynamoDB records are validated and malformed grants fail closed. Old application versions that reject unknown DynamoDB entity types must not be rolled back over a table containing SHARE items without an explicit compatibility/migration plan.

Expiry and revocation are checked in application code, independent of TTL. No TTL attribute/cleanup is introduced. Up to 200 grants per owner (including expired/revoked) and 50 selected IDs per grant are supported. There is no delete/purge/export policy in v1. Existing DynamoDB transaction/item limits still apply; whole-owner reads and retained grants are bounded-product limitations, not an unbounded-scale design. Unknown write outcomes require reloading before retrying; general command idempotency is not implemented.

## Deployment and setup

The user has already completed AWS setup and confirmed deployed private persistence after logout/login. This session does not repeat or expand that live verification.

No new environment variables, table/index definitions, IAM actions, Clerk settings, AWS resources, or email services are required. The existing table-scoped GetItem/Query/PutItem policy supports the new transactional SHARE items. Private development still defaults to files; explicitly configured development and production use DynamoDB. Production never falls back to ephemeral storage. The anonymous demo remains independent.

After reviewing and deploying through your usual process, use two real accounts to verify an invitation end to end: enable the intended audience/category, select a completed commitment's evidence, preview/create/copy, sign in as the intended recipient, accept, refresh, revoke as owner and refresh as recipient. Also try another account, expiry, and removing evidence/category permission. Confirm acceptance persists across logout/login. No deployment or live production mutation was performed by this task.

Clerk's server-side `currentUser()` call is required here for trustworthy verified-email matching and consumes backend API quota; failures fail closed. See [Clerk server user lookup](https://clerk.com/docs/reference/nextjs/app-router/current-user). Stored grant emails and accepted subjects are private operational data. Rate limiting, retention/account deletion, abuse controls, migration and monitoring remain follow-up work.

## Validation

The final full suite passed **142/142 tests**, lint, TypeScript and production build. Detailed local/mocked/live boundaries and the final post-fix result are recorded in [project status](project-status.md). Unit/integration tests use injected identities, temporary local files and a mocked DynamoDB transport, never real AWS. Browser component checks use the actual sharing components with mocked session/provider/API responses and do not certify a live Clerk recipient round trip. Signed-out local production checks are reported separately.

## Changed-file inventory

Added:

- `app/(account)/shared/[ownerId]/[shareId]/page.tsx`
- `app/api/me/shares/route.ts`
- `app/api/shared/[ownerId]/[shareId]/route.ts`
- `application/sharing-service.ts`
- `components/sharing/OwnerShares.tsx`
- `components/sharing/RecipientShare.tsx`
- `components/sharing/SharedEvidenceView.tsx`
- `docs/project-status.md`
- `docs/purpose-based-sharing-v1.md`
- `domain/evidence/visibility.ts`
- `domain/sharing/share.ts`
- `next.config.ts`
- `server/recipient-identity.ts`
- `server/sharing-backend.ts`
- `server/sharing-http.ts`
- `server/sign-in-return.ts`
- `tests/sharing.test.cjs`

Modified:

- `README.md`
- `app/(account)/sign-in/[[...sign-in]]/page.tsx`
- `app/globals.css`
- `application/repositories.ts`
- `components/ApplicationProviders.tsx`
- `components/owner/OwnerProfile.tsx`
- `components/profile/PermissionMatrix.tsx`
- `data/profile-details.ts`
- `docs/authentication-v1.md`
- `docs/dynamodb-persistence-v1.md`
- `middleware.ts`
- `persistence/document-repositories.ts`
- `persistence/dynamodb-store.ts`
- `persistence/file-store.ts`
- `server/clerk-identity.ts`
- `server/owner-backend.ts`
