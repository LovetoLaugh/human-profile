# Human Profile

**People. Context. Trust.**

Human Profile is an experimental platform exploring how people can represent more than static identity information: current context, well-being signals, commitments, behavioral evidence, longer-term observed patterns, and purpose-based sharing.

## Live Demo

🌐 **[Explore Human Profile](https://human-profile.vercel.app/)**

Human Profile is an interactive prototype for modeling human context through evidence, behavioral patterns, and purpose-based sharing.

The public demo uses fictional data and temporary session state. No real health, wearable, reference, or external verification data is used.

### Demo Highlights

- Commitment → Outcome → Evidence → Pattern → Profile pipeline
- Auditable Evidence v2 with provenance, disputes, corrections, and revocation
- Derived reliability patterns
- Purpose-based profile views and permissions
- Event-oriented domain architecture
- Public demo mode with isolated temporary visitor state

It does **not** determine whether someone is a “good” or “bad” person. It separates self-reported information, observed actions, independently verified information, and derived patterns—and makes the evidence behind patterns inspectable. Today, it is a local prototype with mock profile data and a working commitment-to-evidence pipeline.

Current state describes temporary context, such as today’s self-reported well-being. Long-term patterns summarize observations over time; a temporary state or isolated outcome must not become a permanent conclusion about a person. Human Profile models human context, evidence, and behavioral patterns, not whether someone is honest/dishonest or trustworthy/untrustworthy.

## The Problem

Professional history, financial history, social content, and health information typically live in separate systems. Human Profile explores a user-controlled contextual profile that combines current state, historical behavior, and supporting evidence while letting individuals choose what different audiences see.

## Core Product Principle

**Evidence over judgment.** Derived metrics should be traceable to records, not opaque assessments of character.

```mermaid
flowchart LR
    A[Raw Evidence] --> B[Observed Patterns]
    B --> C[Human Profile]
    C --> D[Permission Layer]
    D --> E[Purpose-specific Views]
```

The permission layer currently filters local previews; it is not server-enforced authorization.

## Currently Implemented

| Area | Working functionality | Current limits |
| --- | --- | --- |
| Home `/` | Current state, mini trends, pattern cards, commitment summary, evidence feed; Me/Employer/Landlord/Neighbor previews | State, well-being, and non-reliability pattern labels are mocked |
| My Profile `/profile` | Overview, Timeline, Evidence, About, Permissions; source counts/filters, evidence dialogs, editable About fields, audience controls | About/permissions persist locally; sharing opens a preview, not a public link |
| Commitments `/commitments` | Creation, deadlines, audience selection, completion/missed/cancelled actions, status filters, reliability breakdown | Server-side persistence; terminal outcomes cannot yet be corrected |
| Shared interface | Reusable cards, responsive layouts, keyboard-operable tabs and native dialogs | Other sidebar destinations remain disabled |

Commitment outcomes update Home and My Profile through a shared server-confirmed snapshot. Commitments, evidence/audit history, About fields, and permissions survive navigation, browser refresh, and local server restarts. No external verification is connected: **Verified** labels and verification actions represent mock confirmations only.

### Mocked or unavailable today

Most well-being signals, health information, work history, family information, references, and external verification are prototype data. Wearable data is not connected to a real integration. Backend v1 provides local JSON persistence; production database infrastructure is not implemented. These screens and sample confirmations do not represent real integrations.

## Commitments + Evidence Pipeline

```text
Commitment
    ↓
Outcome
    ↓
Evidence
    ↓
Pattern Engine
    ↓
Human Profile
```

Today, the pattern engine is the domain reliability calculation and shared profile read model, not a separate service.

Active commitments resolve as completed on time, completed late, missed, or cancelled. Completion at or before the deadline is on time; completion after it is late. Without a deadline, completion counts as on time. Missed and cancelled outcomes are explicitly recorded by the user.

```text
eligibleCommitments = completedOnTime + completedLate + missed
followThroughRate = completedOnTime / eligibleCommitments * 100
```

Active and cancelled commitments are excluded. The profile also excludes outcomes with missing, disputed, or revoked supporting evidence; resolving a dispute can restore eligibility. The seeded history contains 50 on-time, 2 late, and 1 missed outcome: **50 / 53 × 100 = 94.34%**, displayed as **94%**. The profile uses a rolling six-calendar-month window, so fixed historical fixtures eventually age out.

Each transition records an **Observed** evidence event—not **Verified** evidence—with its commitment ID, expected date, completion date, outcome, and visibility. The evidence panel exposes the calculation and supporting records without hiding late or missed outcomes.

## Evidence Semantics

- **Self-reported:** information explicitly entered by the user.
- **Observed:** behavior or a state transition observed by Human Profile.
- **Verified:** evidence independently confirmed by an external source.

Completing a commitment inside Human Profile creates **Observed**, not **Verified**, evidence. It records the application transition without independently confirming that the underlying work happened. Existing verified sample records are mock data.

## Evidence v2 — Implemented Locally

Every record has a source classification (`sourceType`), original provenance (`user`, `human-profile`, or `external-source`), source details, creation time, occurrence time (the existing `timestamp`), visibility, and audit history. `type` remains the activity/commitment-outcome discriminator. Commitment records link their entity and outcome metadata; optional confidence is available without invented per-record scores.

Verification status is separate from type: **unverified, pending, verified, disputed, or revoked**. Recorded commitment outcomes begin as **Observed + unverified**. A verification request does not turn an observation into a confirmation.

| Action | Implemented behavior |
| --- | --- |
| Request verification | Self-reported/observed unverified records become pending; duplicate requests are rejected |
| Verify (demo) | Captures an external confirming source and source ID; sets type and status to verified; duplicate verification is rejected |
| Dispute | Requires a reason; excludes evidence from patterns while unresolved |
| Correct text | Requires a reason and changed title/description; preserves before/after values and invalidates prior verification |
| Resolve dispute | Requires a reason; restores the preceding status, or unverified if corrected; preserves every audit entry |
| Revoke | Requires a reason; retains the record but excludes it across reloads; no restore action |

Audit entries append IDs, timestamps, actors/sources, notes, and before/after snapshots of mutable fields. Backdated entries and duplicate IDs are rejected; equal timestamps preserve append order. Immutable origin, occurrence, entity metadata, and visibility remain on the record. History is persisted locally with the evidence record. It is inspectable but not tamper-proof: someone with filesystem access can edit it.

Open **My Profile → Evidence → a record** to inspect provenance, dates, visibility, pattern contribution, and audit history. Owner-only demo actions exercise all transitions, including text corrections. Audience previews retain existing filtering and hide owner audit notes and action controls. Revoked/disputed records remain inspectable in the owner view. Summary counts track current types and statuses; qualitative mock patterns update their eligible supporting records.

Six additional deterministic private demo records show all requested states. The seed has **136 records: 35 self-reported, 82 observed, 19 verified**, including one pending, one disputed, and one revoked record. These examples do not change the **50/53 reliability fixture**.

**Mock verification is not real external verification.** No external service is contacted. Changes are saved server-side and survive refresh. Corrections currently cover evidence title/description; commitment outcome/date revisions, undoing revocation, and production dispute processing remain future work. Original provenance records the origin even when a later correction changes the current classification.

Confidence remains count-based: 0–4 Low, 5–19 Medium, 20+ High. The separate confidence policy can later consider source quality, verification, and recency; none is weighted today.

## Architecture

| Location | Responsibility |
| --- | --- |
| `app/`, `components/` | Routes, presentation, forms, and reusable UI |
| `domain/commitments/` | Validation, immutable state transitions, atomic outcome/evidence updates |
| `domain/evidence/` | Evidence v2 models, immutable services, audit snapshots, and outcome generation |
| `domain/patterns/` | Reliability calculation, observation window, shared profile read model |
| `components/commitments/CommitmentProvider.tsx` | Loads server snapshots; publishes only confirmed saves; loading/error/reload controls |
| `app/api/profile-state/`, `server/` | Node route handlers, input validation, centralized development identity |
| `application/` | Repository contracts and workflow orchestration |
| `persistence/` | Atomic local file adapter and isolated memory test adapter |
| `data/`, `data/mocks/` | Mock profile records and deterministic commitment fixtures |
| `tests/` | Domain and profile-data tests |

See [pipeline design and assumptions](docs/commitment-pipeline.md). The earlier React application in `src/` is retained but excluded from the Next.js build.

## Engineering Decisions

- Business/domain logic lives outside React; UI components do not own reliability calculations.
- Patterns should be derived from evidence and remain explainable. Today, reliability reads recorded commitment outcomes and links to their generated evidence; other patterns are mocked.
- The domain design is event-oriented: important state transitions should be represented as events. Terminal commitment transitions persist the outcome and generated evidence in one atomic transaction. This is event-oriented, not full event sourcing; no message broker is implemented.
- Observed means an application-recorded action, not independent confirmation of the underlying work.
- Active/cancelled commitments do not distort the denominator; duplicate dispatches do not duplicate evidence.
- Confidence is explicit: **0–4 observations: Low; 5–19: Medium; 20+: High**. This initial product rule is not a scientific assessment.
- Audience previews separate aggregate patterns from permission to inspect individual evidence. Home and My Profile currently use distinct preview rules.
- Mock data supports domain iteration; other qualitative patterns remain illustrative rather than validated calculations.

## Testing

**75 tests pass** in the current validation run. Coverage includes completed/late/missed outcomes, active/cancelled exclusions, zero eligible observations, confidence boundaries, deadline equality/timezones, validation, immutable transitions, duplicate actions, evidence traceability, calendar windows, and permission isolation. Evidence v2 tests cover creation, source attribution, verification, disputes/restoration, corrections, revocation, ordered audit snapshots, immutable provider updates, and pattern exclusions.

Backend tests additionally cover repository round trips, user isolation, reloads, seed/reset behavior, concurrent writes, atomic failure handling, authoritative request parsing, and persisted Evidence v2 eligibility. They use isolated temporary directories, never your runtime file.

Run `npm test`. Tests use Node’s built-in runner and the existing TypeScript compiler, without an additional test framework.

## Tech Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, ESLint, and Node’s built-in test runner.

## AI-Assisted Development

This project is being developed using an AI-assisted engineering workflow with OpenAI Codex.

AI is used to accelerate implementation, refactoring, testing and iteration. Product requirements, architecture decisions, domain modeling, constraints and code review remain deliberate parts of the engineering process.

## Backend v1 — Implemented

```text
Next.js UI
    ↓
Application/API layer
    ↓
Domain services
    ↓
Repository interfaces
    ↓
Local durable store
```

`GET /api/profile-state` loads a user-scoped snapshot and derived reliability. `POST /api/profile-state` accepts commitment, evidence, or profile commands. The application service calls existing domain functions inside a repository transaction, then returns the persisted result. UI state is not optimistically changed; failed saves show an error and a reload control. Server timestamps and demo verification attribution are authoritative.

The file adapter stores one versioned JSON document per user under **`.human-profile-data/<userId>.json`**. Commitment and evidence envelopes carry `ownerId`; the profile envelope holds About/permissions. A per-user filesystem lock serializes transactions across local processes. Writes flush a temporary file and atomically rename it, so outcome and evidence cannot be partially published. Repository interfaces keep files, JSON, React, Next.js, and AWS outside the domain layer. Reliability is calculated from saved records, never persisted as a primary score.

The temporary identity is centralized in `server/development-session.ts` as `dev-user-001`. Routes do not accept browser-supplied owner IDs. This is **not authentication**: local clients share the development identity. Development and production-build preview commands bind to loopback; the API rejects foreign Host/Origin values. Use mock/dev data only.

First access initializes existing deterministic commitments and all Evidence v2 examples if the user has no records. A saved profile marks initialization; reloads do not reseed. If a partial partition has records but no profile, only profile defaults are added. The initial fixture still gives **94.34% → 94%** within its observation window.

To reset, **stop the server**, run `npm run reset:data`, then restart. The reset command moves the entire store to a recoverable timestamped backup and the next request seeds fresh data. Runtime files, locks, temporary writes, and default backups are gitignored. Optional server-only `HUMAN_PROFILE_DATA_DIR` selects another local directory; no environment file or credentials are required. Keep custom directories and their backups outside Git.

See [Backend v1 details](docs/backend-v1.md) for transaction guarantees, reset/recovery, and limitations.

## Future Backend Architecture

```text
Next.js / Clients
    ↓
Application/API layer
    ↓
Domain services
    ↓
Repository interfaces
    ↓
DynamoDB

External systems
    ↓
Kafka
    ↓
Consumers
    ↓
Same application/domain/evidence model
```

**DynamoDB and Kafka are not implemented.** The preferred future direction is document/key-value persistence, not a relational-first backend. A possible DynamoDB key strategy is `PK = USER#<userId>` with `SK = PROFILE`, `COMMITMENT#<id>`, or `EVIDENCE#<id>`. Audit history starts embedded; a future adapter must address growth, pagination, transaction limits, and conditional updates. No AWS SDK or adapter skeleton was added.

Forms remain event producers through domain transitions and evidence. Wearables may eventually be additional producers. Introduce Kafka only when asynchronous/high-volume integration needs justify it.

## Roadmap — Future Work

- Production DynamoDB adapter and authentication.
- Commitment outcome/date revisions, reversal workflows, and production evidence audit/dispute operations. Evidence provenance, verification status, text corrections, disputes, and audit history already work locally.
- External verification and wearable integrations.
- Kafka-based event ingestion when justified.
- Family-level aggregation and a richer permission engine.
- Public/integration APIs, production deployment, and observability.

## Privacy / Responsible Design

The design prioritizes user control, purpose-specific sharing, evidence provenance, explainable patterns, and avoiding opaque character scoring. This is an experimental personal project using mock data. The development API returns the owner’s full saved snapshot; UI audience previews are not a security boundary. Sample fixtures also remain in the client bundle for illustrative sections. There is no authentication, real sharing, or connected health/financial data.

## Local Development

```bash
npm install
npm run dev       # http://127.0.0.1:3000
npm test
npm run lint
npm run typecheck
npm run build
npm start         # preview the production build on loopback
# Stop the server before resetting:
npm run reset:data # archive local data; next access seeds fresh mock records
```

Stop the dev server before building; both use `.next/`. Keep credentials, `.env` files, dependency folders, and generated output out of Git.

## Project Status

**Active personal product project / experimental prototype.** The commitment pipeline and local durable persistence are functional; production DynamoDB, external verification, and production access controls are future work.
