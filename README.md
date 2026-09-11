# Human Profile

**People. Context. Trust.**

Human Profile is an experimental platform exploring how people can represent more than static identity information: current context, well-being signals, commitments, behavioral evidence, longer-term observed patterns, and purpose-based sharing.

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
| My Profile `/profile` | Overview, Timeline, Evidence, About, Permissions; source counts/filters, evidence dialogs, editable About fields, audience controls | About/permissions are page-local; sharing opens a preview, not a public link |
| Commitments `/commitments` | Creation, deadlines, audience selection, completion/missed/cancelled actions, status filters, reliability breakdown | Session memory; terminal outcomes cannot yet be corrected |
| Shared interface | Reusable cards, responsive layouts, keyboard-operable tabs and native dialogs | Other sidebar destinations remain disabled |

Commitment outcomes update Home and My Profile through shared session state. Client-side navigation preserves these changes; refreshing restores deterministic sample data. No external verification is connected: **Verified** labels and verification actions represent mock confirmations only.

### Mocked or unavailable today

Most well-being signals, health information, work history, family information, references, and external verification are prototype data. Wearable data is not connected to a real integration. Persistent backend storage is not implemented: records and changes exist only in session memory. These screens and sample confirmations do not represent real integrations.

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
| Revoke | Requires a reason; retains the record but permanently excludes it within this session; no restore action |

Audit entries append IDs, timestamps, actors/sources, notes, and before/after snapshots of mutable fields. Backdated entries and duplicate IDs are rejected; equal timestamps preserve append order. Immutable origin, occurrence, entity metadata, and visibility remain on the record. This is inspectable in-memory history, not a durable or tamper-proof audit system.

Open **My Profile → Evidence → a record** to inspect provenance, dates, visibility, pattern contribution, and audit history. Owner-only demo actions exercise all transitions, including text corrections. Audience previews retain existing filtering and hide owner audit notes and action controls. Revoked/disputed records remain inspectable in the owner view. Summary counts track current types and statuses; qualitative mock patterns update their eligible supporting records.

Six additional deterministic private demo records show all requested states. The seed has **136 records: 35 self-reported, 82 observed, 19 verified**, including one pending, one disputed, and one revoked record. These examples do not change the **50/53 reliability fixture**.

**Mock verification is not real external verification.** No external service is contacted. Changes survive client navigation but reset on refresh. Corrections currently cover evidence title/description; commitment outcome/date revisions, undoing revocation, and durable dispute workflows remain future work. Original provenance records the origin even when a later correction changes the current classification.

Confidence remains count-based: 0–4 Low, 5–19 Medium, 20+ High. The separate confidence policy can later consider source quality, verification, and recency; none is weighted today.

## Architecture

| Location | Responsibility |
| --- | --- |
| `app/`, `components/` | Routes, presentation, forms, and reusable UI |
| `domain/commitments/` | Validation, immutable state transitions, atomic outcome/evidence updates |
| `domain/evidence/` | Evidence v2 models, immutable services, audit snapshots, and outcome generation |
| `domain/patterns/` | Reliability calculation, observation window, shared profile read model |
| `components/commitments/CommitmentProvider.tsx` | Root-layout React context/reducer for shared session state |
| `data/`, `data/mocks/` | Mock profile records and deterministic commitment fixtures |
| `tests/` | Domain and profile-data tests |

See [pipeline design and assumptions](docs/commitment-pipeline.md). The earlier React application in `src/` is retained but excluded from the Next.js build.

## Engineering Decisions

- Business/domain logic lives outside React; UI components do not own reliability calculations.
- Patterns should be derived from evidence and remain explainable. Today, reliability reads recorded commitment outcomes and links to their generated evidence; other patterns are mocked.
- The domain design is event-oriented: important state transitions should be represented as events. Terminal commitment transitions currently create evidence atomically in memory; there is no durable event store or message broker.
- Observed means an application-recorded action, not independent confirmation of the underlying work.
- Active/cancelled commitments do not distort the denominator; duplicate dispatches do not duplicate evidence.
- Confidence is explicit: **0–4 observations: Low; 5–19: Medium; 20+: High**. This initial product rule is not a scientific assessment.
- Audience previews separate aggregate patterns from permission to inspect individual evidence. Home and My Profile currently use distinct preview rules.
- Mock data supports domain iteration; other qualitative patterns remain illustrative rather than validated calculations.

## Testing

**52 tests pass** in the current validation run. Coverage includes completed/late/missed outcomes, active/cancelled exclusions, zero eligible observations, confidence boundaries, deadline equality/timezones, validation, immutable transitions, duplicate actions, evidence traceability, calendar windows, and permission isolation. Evidence v2 tests cover creation, source attribution, verification, disputes/restoration, corrections, revocation, ordered audit snapshots, immutable provider updates, and pattern exclusions.

Run `npm test`. Tests use Node’s built-in runner and the existing TypeScript compiler, without an additional test framework.

## Tech Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, ESLint, and Node’s built-in test runner.

## AI-Assisted Development

This project is being developed using an AI-assisted engineering workflow with OpenAI Codex.

AI is used to accelerate implementation, refactoring, testing and iteration. Product requirements, architecture decisions, domain modeling, constraints and code review remain deliberate parts of the engineering process.

## Backend Direction — Future Architecture

Human Profile’s preferred future direction avoids a traditional relational-first backend: document-oriented persistence for flexible profile state, an event-oriented evidence model, and derived profile/read models. None of this persistence infrastructure is implemented today.

Forms today act as event producers in the local flow: user actions dispatch domain commands, and outcome transitions generate evidence. The intended broader architecture is:

```text
User action / Form
      ↓
Domain Event
      ↓
Evidence
      ↓
Pattern Engine
      ↓
Human Profile
```

Later, wearables and external systems can become additional event producers:

```text
Wearables / External Systems
          ↓
        Kafka
          ↓
   Event Consumers
          ↓
   Normalized Evidence
          ↓
    Pattern Engine
          ↓
     Human Profile
```

**Kafka is not implemented today.** It would be introduced when asynchronous or high-volume integrations such as wearables justify it, rather than prematurely adding infrastructure to the local prototype.

## Roadmap — Future Work

- Non-relational persistent backend and authentication.
- Commitment outcome/date revisions, reversal workflows, and durable evidence audit/dispute storage. Evidence provenance, verification status, text corrections, disputes, and audit history already work locally.
- External verification and wearable integrations.
- Kafka-based event ingestion when justified.
- Family-level aggregation and a richer permission engine.
- APIs, deployment, and observability.

## Privacy / Responsible Design

The design prioritizes user control, purpose-specific sharing, evidence provenance, explainable patterns, and avoiding opaque character scoring. This is an experimental personal project using mock data. All records ship in the client bundle; UI visibility controls are not a security boundary. There is no authentication, real sharing, or connected health/financial data.

## Local Development

```bash
npm install
npm run dev       # http://localhost:3000
npm test
npm run lint
npm run typecheck
npm run build
npm start         # serve the production build
```

Stop the dev server before building; both use `.next/`. Keep credentials, `.env` files, dependency folders, and generated output out of Git.

## Project Status

**Active personal product project / experimental prototype.** The commitment pipeline is functional locally; persistence, external verification, and production access controls are future work.
