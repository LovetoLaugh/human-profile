# Human Profile project checkpoint

Updated 2026-10-07. Purpose-Based Sharing v1 implementation and local/mocked workflow validation are complete. The final post-fix tests, lint, typecheck, build and mocked browser checks passed. This checkpoint does not claim live sharing verification.

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
