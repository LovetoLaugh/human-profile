# Human Profile

A personal, user-controlled profile dashboard built with Next.js App Router, React, TypeScript, and Tailwind CSS. It presents current state, well-being trends, and behavioral patterns with context rather than assigning a character score.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build after `npm run build`.

## Structure

- `app/page.tsx`: Home route.
- `app/layout.tsx`: Root layout and page metadata.
- `app/globals.css`: Tailwind import, visual design, responsive layouts.
- `components/Dashboard.tsx`: Dashboard composition and reusable sidebar, top bar, current-state metrics, mini charts, pattern cards, commitments, evidence, and perspective selector.
- `components/Icon.tsx`: Small shared SVG icon component; no icon dependency.
- `types/profile.ts`: User, CurrentState, WellbeingMetric, BehavioralPattern, Commitment, EvidenceEvent, and ProfilePerspective interfaces/types.
- `data/profile.ts`: Typed sample profile records and example visibility rules.

Home (`/`) and My Profile (`/profile`) are implemented. Both are linked in the sidebar. Other sidebar destinations remain disabled placeholders. The previous React application in `src/` is preserved and excluded from the new build.

## Prototype behavior

- Me sees all information. Employer sees professional commitments, reliability, growth, and selected work/learning evidence. Landlord sees reliability, agreement/payment evidence, and a mock reference. Neighbor sees reliability, community activity, selected neighborhood evidence, and self-reported shared interests.
- Family, Friend, and Custom remain visible but disabled until their preview rules are implemented.
- Preview rules filter rendered content, including evidence dialogs. These are local UI previews, not a security boundary: mock records ship to the browser. No actual access is granted.
- `data/profile.ts` defines raw records. Patterns link to those records through `evidenceIds`. Reliability derives from 53 historical commitment records: 50 on-time completions, 2 late completions, and 1 missed commitment. 50 / 53 rounds to 94%. Late completions are separate from on-time completions.
- Qualitative pattern labels and confidence are illustrative interpretations of linked activity, not validated assessments. Self-reported, Observed, and Verified have distinct reusable badges. Verified means confirmed only within simulated mock records.
- Every pattern has a View evidence dialog. It supports native keyboard focus containment, Escape, closing, and focus restoration. Shared previews display only authorized raw record details; the reliability aggregate is shared separately.
- The Recent Evidence feed uses selected recent sample records. Full linked records are available in pattern dialogs. Landlord references are separate mock statements, not derived metrics.
- Commitment toggles change session state only. Historical evidence and reliability remain separate from current checklist state. Preview commitments are read-only.
- Charts are illustrative, self-reported mock trends. No database, authentication, health API, or external verification exists.

Additional reusable components: `components/EvidenceBadge.tsx` and `components/EvidencePanel.tsx`.

## My Profile

Open http://localhost:3000/profile. The page uses the existing sidebar, top bar, card styles, current-state card, pattern cards, icons, and mini charts.

- `app/profile/page.tsx`: Profile route and metadata.
- `components/profile/ProfilePage.tsx`: Tab, edit, audience-preview, modal, and permission state.
- `components/profile/ProfileHeader.tsx`, `ProfileTabs.tsx`: Profile identity, actions, visibility badge, keyboard-accessible tabs.
- `components/profile/ProfileOverview.tsx`: Overview, well-being cards, pattern cards and pattern evidence details.
- `components/profile/ProfileEvidence.tsx`: Source filters, paginated evidence cards, evidence summary and detail modal.
- `components/profile/ProfileTimeline.tsx`: Timeline with linked source records and date ranges.
- `components/profile/ProfileAbout.tsx`: Editable, explicitly user-provided About information.
- `components/profile/PermissionMatrix.tsx`: Independent category/audience switches.
- `components/profile/ProfileModal.tsx`: Shared native dialog with focus containment, Escape dismissal, and focus restoration.
- `data/profile-details.ts`: About data, 127 evidence records, source counts, mock patterns, timeline links, section permissions, and visibility helpers.
- `tests/profile-data.test.cjs`: Evidence-count, traceability, date-range and permission-isolation checks. Run `npm test`.

The profile mock fixture extends the Home history with 24 personal check-ins and uses illustrative provenance assignments: 32 self-reported, 61 observed, 34 verified. Verification is simulated. Profile completeness and update time are fixed mock metadata, not computed assessments. Qualitative labels are mock interpretations; Financial Responsibility remains a user-provided reflection.

All five profile tabs work locally. Edit Profile and Edit About update only React state. Share Profile reviews an audience's current categories and opens its preview; it never publishes a link. View As previews Public, Friend, Neighbor, Employer, Landlord, and Family. Permissions changes affect these profile previews only, independently of Home's sample perspective rules. Reloading restores defaults.

Evidence requires both the Evidence permission and the relevant category, plus explicit record visibility for the selected audience. Sharing a pattern never grants raw-evidence access. Pattern dialogs and timeline entries apply the same visibility checks. Timeline aggregates are omitted if any linked record is hidden, avoiding disclosure of private categories through summary titles. Interests, Growth, and References have separate controls in addition to the nine primary categories. The permission matrix is always an owner control, not shared content.

This remains a frontend prototype: all mock data is present in the client bundle, and UI filtering is not authorization. No authentication, database, API integration, or real sharing has been added.
