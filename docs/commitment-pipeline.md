# Commitment → outcome → evidence → reliability → profile

The first live data flow runs locally in a root-layout React provider. Navigating with the application links preserves it across Home, My Profile, and Commitments. Refreshing the browser restores deterministic mock history. There is no database, API, account, or localStorage persistence.

## Domain boundaries

- `domain/commitments/types.ts`: commitment status, category, timestamps, audiences, and evidence references.
- `domain/commitments/service.ts`: creation validation, deadline interpretation, completion classification, and explicit missed/cancelled transitions. Functions return new objects without mutating their inputs. Clock and ID values are supplied by the caller.
- `domain/evidence/types.ts` and `commitment-outcome.ts`: evidence schema and observed outcome generation. The metadata records commitment ID, deadline, completion timestamp, and outcome.
- `domain/commitments/pipeline.ts`: atomic local transaction. A terminal outcome and its evidence enter state together; repeated dispatches cannot create duplicate outcome records.
- `domain/patterns/reliability.ts`: pure calculation and six-calendar-month window selection.
- `domain/patterns/reliability-profile.ts`: shared read model for the rate, breakdown, confidence, card text, and exact eligible evidence IDs.
- `components/commitments/CommitmentProvider.tsx`: React adapter. UI components render the read model and dispatch commands; they do not decide whether an outcome is late or calculate the rate.

## Reliability rule

Eligible commitments = completed on time + completed late + missed.

Follow-through rate = completed on time / eligible commitments × 100.

The domain result is rounded to two decimal places; the UI rounds that value to a whole percentage. No eligible commitments produces a finite zero in the domain and a “Not enough data”/dash presentation. Cancelled and active commitments are excluded. Deduplication by commitment ID prevents repeated objects from inflating observations.

The profile read model selects outcomes by `resolvedAt` within the last six calendar months, inclusive, ending at the current session clock. Calendar subtraction clamps to the last day of shorter months. The provider refreshes the clock every minute and advances it when actions occur. The standalone `calculateReliability(commitments)` function operates on all commitments supplied to it; window selection is separate and testable.

Initial sample: 50 completed on time, 2 completed late, 1 missed, 3 cancelled, and 2 active. Thus 50 / 53 × 100 = 94.34%, displayed as 94%. All terminal mock records are produced through the same transition service as new actions. The fixture dates and IDs are fixed; when the real clock advances sufficiently, older outcomes intentionally leave the six-month window.

Confidence uses only the number of eligible observations: 0–4 Low; 5–19 Medium; 20+ High. This is an initial product rule, not a scientific or character assessment.

## Outcome and deadline assumptions

- Completing exactly at a deadline is on time; one millisecond later is late.
- Without a deadline, completion counts as on time.
- A date-only deadline means 23:59:59.999 in the creator’s local timezone. It is stored as an ISO timestamp. Evidence and list timestamps are displayed explicitly in UTC.
- Past due dates may be entered. An active commitment does not automatically become missed when overdue; the user records an outcome explicitly. Explicitly marking missed before its deadline is also allowed.
- The initial version treats terminal outcomes as final. Reopening/correcting a commitment will require a revision model; it must not silently overwrite existing evidence.
- Cancelled outcomes still create evidence, but their records are absent from the reliability denominator and its calculation evidence panel.

## Provenance and visibility

Creation is user-provided intent. Resolving it records an app-observed state transition, using `sourceType: observed` and `verificationStatus: recorded`. This does not independently establish that the underlying task was performed. The app never upgrades completion to Verified. Independent-source verification remains future work.

Outcome evidence copies the commitment’s audiences; an empty list means Me only. My Profile applies its existing evidence and category permissions in addition to per-record visibility. Home retains its existing simpler audience preview rules. Sharing a reliability aggregate does not reveal its private underlying records. The shared evidence panel applies the current preview’s allowed records and still discloses the aggregate late/missed counts.

Both pages now read the same commitment evidence without rewriting provenance to achieve decorative source counts. The sample profile contains 130 records: 32 self-reported, 80 observed, and 18 mock-verified community records. Counts increase when new outcomes are recorded. The 3 cancellation records explain the increase from the earlier 127-record fixture. Other profile sections remain mock data.

## Tests and known debt

`npm test` uses Node’s test runner and the existing TypeScript compiler, with no added dependency. Tests cover requested rates, exclusions, zero observations, confidence boundaries, duplicate IDs, exact/late/timezone deadlines, invalid input, immutable transitions, atomic/idempotent outcome generation, deterministic fixtures, record traceability, permission isolation, and calendar-window boundaries.

Current limits: session memory only; no undo/revision flow, external verification, or enforcement beyond the UI. Existing evidence presentation fields (`kind`, `verification`, `perspectives`, etc.) are retained as a compatibility adapter alongside normalized domain fields. They should eventually move to dedicated view models. About and permission state remain page-local as before, and non-commitment pattern labels are illustrative. Historical timeline groups remain anchored to the sample date; new outcomes appear separately under Recent updates.
