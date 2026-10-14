# Human Profile project checkpoint

Updated 2026-10-14. Purpose-Based Sharing v1 implementation and local/mocked workflow validation are complete. The final post-fix tests, lint, typecheck, build and mocked browser checks passed. This checkpoint does not claim live sharing verification.

## Completed milestones

- Commitments, outcome evidence, derived reliability and patterns.
- Evidence v2 provenance, correction/dispute/revocation and audit workflows.
- Anonymous fictional demo, temporary visitor isolation and server-rendered first-load introduction.
- Clerk Google authentication and private `/me` owner isolation.
- DynamoDB persistence v1 with authenticated owner partitions, transactional writes and conditional PROFILE revisions.
- **User-confirmed live status:** AWS setup is complete and deployed private data persisted after logout/login. Earlier pending-setup documentation predates this confirmation. No additional live checks are inferred.

## This session: Purpose-Based Sharing v1

Implemented owner creation, server-projected preview, listing, invitation-link copying and revocation; recipient sign-in/acceptance/read-only view; explicit evidence allowlists, purpose/audience/expiry, verified-email invitation matching and subject binding. Existing permissions remain an upper bound. Reads recheck current evidence, revocation and expiration. Private audit notes and unrelated profile fields are not returned. Patterns/scores are omitted.

Repository contracts and file/memory/DynamoDB adapters now support owner-partition SHARE records. Existing revision transactions protect grants alongside permission/evidence changes. No scans, new tables or indexes are introduced. Shared pages bypass the demo provider and have no-store/noindex/no-referrer protections. Sign-in supports strictly validated local invitation return paths. Anonymous demo behavior and simulated sharing remain separate.

## Validation evidence

- Last full run: **142/142 tests passed** (previous 120 plus 22 focused sharing tests); no skipped tests.
- Lint: passed with zero warnings. TypeScript: passed. Production build: passed. The final repeat after the last UI-only fix also passed.
- Diff/security review: no credential-pattern matches in changed files; no environment-file changes; no AWS/Clerk imports added to domain/application. No production data or AWS resources accessed/changed.
- **Mocked/isolated tests:** forged ownership/recipient claims, wrong recipient, unverified email, subject binding, explicit field/ID allowlists, current permissions and evidence eligibility, expiry/revocation, safe sign-in return, legacy local-file round trips, owner isolation, DynamoDB atomic failure/pagination, competing acceptance, revocation versus acceptance, and permission changes versus creation. The AWS transport is mocked; local tests use disposable directories.
- **Browser component checks:** actual owner/recipient sharing components, with mocked session/provider/API responses. Selection, removing a selected record after eligibility changes, server-preview rendering, create/copy/list/revoke, save failure, recipient acceptance/read-only output, empty/expired/revoked/wrong-account states passed. Recipient desktop/mobile overflow checks passed. Screenshots were inspected. This is not a real Clerk two-account test.
- **Local production browser checks:** anonymous Home HTTP 200 with meaningful initial HTML and one intro; sharing APIs GET/POST return 401/no-store/noindex signed out; invitation shell no-store/no-referrer/noindex; no demo API call on shared pages; sign-in-required state and preserved return path reach Clerk Google UI; `/me` remains protected; public Share Profile remains explicitly simulated. AWS table/region were explicitly blank for this preview to prevent AWS access.
- **Not performed:** live recipient acceptance with two real Clerk accounts, deployed sharing persistence, live expiry/revocation, deployment, Git push, or AWS changes.

## Remaining work and next step

After code review, deploy through the existing process (not performed here), then test a real two-account invitation from owner creation through recipient sign-in/acceptance, refresh and logout/login persistence. Revoke it and verify denial; also verify a wrong account, expiration and permission removal. No new environment variables, table/IAM changes or email provider are needed.

Limits: 50 selected records and 200 retained grants per owner; whole-owner snapshot reads; no grant editing/deletion or cleanup; email-controller semantics at acceptance; no shared aggregates; no general command idempotency. Revocation stops future requests and cannot erase copies or already authorized responses. Old DynamoDB readers that reject SHARE entities need a compatibility plan before rollback. Retention, rate limiting, operational hardening and migration remain follow-ups.

Detailed behavior and setup: [Purpose-Based Sharing v1](purpose-based-sharing-v1.md).


## Sharing v1 review and deployment preparation — 2026-10-14

Repository inspection found no AGENTS.md in the repository or ancestor locations. The starting working tree was clean on `master`, with `origin` pointing to `https://github.com/LovetoLaugh/human-profile.git`.

The old “not pushed/deployed” checkpoint was stale: GitHub's branch API confirms `master` at `d65baaaa091bb2e2547b3cefa5e875094546837e`. GitHub deployment `6923646513` records a successful **Production** deployment on 2026-10-07 at 23:51 UTC. Vercel project: `human-profiling/human-profile`; deployed URL: `https://human-profile-byy7biuno-human-profiling.vercel.app`. The documented public alias is `https://human-profile.vercel.app/`. These are deployment metadata observations, not proof that recipient sharing works live.

### Review findings and changes

1. Recipient state was keyed only by authenticated subject. Navigating between invitation URLs as the same account could retain the previous invitation's evidence until the next effect/request. Keying by subject, owner partition and share ID destroys the old state before rendering the new invitation.
2. Acceptance could pass the expiry check, spend time publishing its transaction, then return active evidence after expiry. The service now rechecks active results after the transaction completes and returns only an expired status. The client also rejects already-expired active responses before rendering. An acceptance that already committed may remain recorded, but it confers no access past expiry.

Both regressions failed against the previous implementation and pass after the fixes. Existing recipient matching, bound-subject enforcement, server-derived owner mutation scope, field allowlists, revocation, current-permission filtering, partition queries and revision conditions were reviewed; no additional concrete authorization bypass was found in this review. No new features or storage schema changes were introduced.

### Validation for this review

- Full suite: **144/144 tests pass**, including the previous 142 and two regression tests; zero skipped/failed.
- Lint: passed, zero warnings. TypeScript: passed. Production build: passed. `git diff --check`: passed.
- Mocked browser regressions: passed using the actual RecipientSession/RecipientShare components. Changing invitations clears old evidence before the next response; an already-expired active response never paints its evidence. Clerk identity/API responses were mocked, with no AWS or real account access.
- No real account sign-in, AWS mutation or live sharing check was performed by this review so far. Prior local-production and mocked browser checks above remain historical evidence.

### Prepared delivery and approval boundary

Proposed delivery: one review-fix commit on existing `master`, pushed to `origin/master` in `LovetoLaugh/human-profile`, triggering the existing Vercel **Production** integration for `human-profiling/human-profile`. Commit contents: `application/sharing-service.ts`, `components/sharing/RecipientShare.tsx`, `tests/sharing.test.cjs`, this checkpoint, and `docs/purpose-based-sharing-v1.md`. Suggested message: `fix: enforce sharing expiry and isolate invitation views`.

No review-fix push or deployment has been performed. Explicit user approval is required before pushing. Browser validation is complete and the five-file local commit titled `fix: enforce sharing expiry and isolate invitation views` is prepared on `master`. The exact next step is explicit user approval to push that review commit to `origin/master` for Vercel Production; then verify deployment and begin the live ledger below. If GitHub master changes before push, inspect and reconcile it first without force-pushing.

### Live verification ledger (review fixes)

| Check | Status |
| --- | --- |
| Owner creates a clearly labelled test invitation | Not performed |
| Intended recipient signs in, accepts and sees only selected evidence | Not performed |
| Wrong account denied | Not performed |
| Revocation blocks next read | Not performed |
| Expiry blocks access | Not performed |
| Tightened permissions remove affected evidence | Not performed |
| Shared responses exclude private audit notes and unrelated data | Not performed live; covered by isolated tests |
| Anonymous demo and private persistence still work | Not rechecked live this review; prior AWS persistence is user-confirmed |

After approved deployment, ask the user to sign in with their test accounts. Use labels beginning `SHARING V1 TEST 2026-10-14` and fictional evidence only. Create two evidence records but select only one, plus a private audit-note marker and unrelated About marker for response inspection. Use a separate short-lived invitation for expiry so revocation and expiry can be observed independently. Tighten category permissions while an accepted, non-revoked share is active; verify the next read omits its evidence, then revoke and verify denial. Record each result only when observed or explicitly confirmed by the user. Never record credentials or full private responses in this checkpoint.
