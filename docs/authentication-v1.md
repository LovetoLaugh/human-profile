# Authentication & Profile Ownership v1

Human Profile has separate public and private experiences. Google authentication through Clerk establishes ownership; it does not turn the fictional demo into a real person's profile.

| Route | Identity | Data |
| --- | --- | --- |
| `/`, `/profile`, `/commitments`, `/api/profile-state` | Anonymous demo cookie on Vercel; existing development identity in local mode | Alex Morgan fixtures and existing demo workflows |
| `/sign-in` | Public sign-in-or-up screen | Clerk's prebuilt Google sign-in flow; no profile records |
| `/me`, `/api/me/profile-state` | Verified Clerk user session mapped to `AuthenticatedIdentity` | Empty private profile, then only that owner's saved records |

## Architecture and security boundary

```text
Google → Clerk session → server/clerk-identity.ts
                              ↓
                 AuthenticatedIdentity { subject }
                              ↓
          owner request boundary / privateOwnerKey
                              ↓
                    ProfileService
                              ↓
               unchanged domain services
                              ↓
                RepositoryStore interfaces
                              ↓
          local files / temporary owner memory
```

`@clerk/nextjs` 7.9.4 supports the installed Next.js 15.5.25 and React 19.2.5. Next.js 15 uses `middleware.ts`, not `proxy.ts`. Middleware initializes Clerk only on account routes and the private API. Access is enforced again at the resource: `/me` redirects missing sessions to `/sign-in`, while both private API methods return JSON **401** without touching repositories. Missing keys disable sign-in, not the public demo. Invalid configuration or infrastructure errors fail closed; there is no development-user fallback for private requests.

Clerk-specific imports are confined to infrastructure, account-route composition and account controls. `application/authenticated-identity.ts` defines the provider-independent `AuthenticatedIdentity { readonly subject: string }`. The adapter accepts Clerk user **session tokens** and maps the verified user ID to `subject`. Email is not an ownership key and is not copied into the profile.

The request boundary creates `owner-<SHA-256(subject)>`, a stable filename-safe, namespaced storage key. The hash is a storage encoding, not authentication. Only the verified session supplies the subject. Query strings, owner-like headers and body fields cannot select a repository partition. Commands are parsed into explicitly permitted fields. Profile saves overwrite ownership with the server-derived key; commitment/evidence IDs are resolved only inside that owner's partition. Foreign Host/Origin combinations and cross-site private requests are rejected. Successful and error API responses are private/no-store. No shared-profile endpoint is added; audience selections remain preview metadata, not access grants.

The private client uses `/api/me/profile-state`; the public client keeps `/api/profile-state`. Changing accounts remounts the private provider so another user's snapshot cannot be reused. Private 401/403 responses clear its snapshot. Server checks remain authoritative regardless of client routing or controls.

## Initialization and persistence

Private profiles use `ProfileService` with empty initialization and the real clock. About fields, commitments and evidence start empty; all audience permissions start false. Alex Morgan, mocked metrics and historical evidence are not seeded into private accounts. Existing commitment → observed evidence → reliability rules are unchanged. Owner audit actions are attributed to the profile owner; verification actions are still explicitly simulated and do not contact an external verifier.

| Runtime | Private adapter | Limitation |
| --- | --- | --- |
| Local default | Existing `FileStore`, under `.human-profile-data/owners/owner-<hash>.json` | Durable only on this development machine; filesystem access can read/edit it |
| Vercel or explicit `public-demo` mode | Separate `TemporaryOwnerStore` instance over `MemoryStore` | Non-durable, per server instance; not a production database |

`HUMAN_PROFILE_DATA_DIR` changes the local base directory; private files stay in its `owners` subdirectory, away from the development demo file. Hosted owner storage never opens local files and never uses the demo repository or demo cookie. It expires inactive owners after 30 minutes, permits at most 50 resident owners per instance, and rejects new owners at capacity rather than evicting an active owner. Transactions in progress are not expired. Limits are 250 commitments, 500 evidence records and 1,500 audit entries per owner; exceeding a limit rolls back the transaction.

Hosted private state can disappear after inactivity, restarts or routing to another instance. This is disclosed at sign-in and on `/me`. Use non-sensitive test information until durable production persistence is implemented. `npm run reset:data` archives the local base directory including private profiles; stop the server first. No automatic migration between Clerk development/production users or from demo identities exists.

## Manual Clerk / Google setup

No credentials were available during implementation. The source contains no fabricated credentials. `.env.example` contains only names, blank values and route configuration.

1. Create a Clerk application. Under **SSO connections**, add Google for all users and enable sign-up/sign-in. For this v1 experience, make Google the sole enabled sign-in method; disable password/email-code and other social methods if the dashboard enabled them by default. Avoid adding required profile fields or onboarding tasks; the app uses Clerk's prebuilt sign-in-or-up UI.
2. For local development, Clerk's development Google connection uses shared OAuth credentials. Copy the matching development publishable and secret keys from Clerk into an ignored `.env.local`:

   ```dotenv
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>
   CLERK_SECRET_KEY=<your Clerk secret key>
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/me
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/me
   ```

   Start with `npm run dev`. Use the same origin throughout the flow (`http://localhost:3000`, as printed by the project). Never prefix the secret key with `NEXT_PUBLIC_`. Restart after changing keys. Keep both startup scripts bound to `localhost`: Next.js 15 normalizes numeric loopback middleware URLs to `localhost`, and Clerk’s same-page rewrite can otherwise be treated as an external proxy back to this server.
3. Create/configure the Clerk production instance for the intended production domain and complete Clerk's domain/DNS setup. For Google production authentication, enable custom credentials. Create a Google Cloud OAuth web client, configure its consent screen and intended audience, add your app origin, and copy Clerk's **exact Authorized Redirect URI** into Google. Store the Google client ID/secret in Clerk, not in this app. Complete Google's publishing requirements before allowing general users. Use a regular browser to test Google OAuth.
4. In Vercel → project → Settings → Environment Variables, add the matching production `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, plus the route variables above, scoped to Production. Redeploy after setting them: public variables are build-time values. Configure Preview separately with appropriate development credentials and allowed origins; do not reuse an unrelated production instance. `VERCEL=1` still forces temporary hosted storage, even if a local mode override is present.
5. In Clerk's redirect/path settings, use `/sign-in` for sign-in/sign-up entry and `/me` for application home/after-auth destinations. The account layout and SignIn component force successful sign-in and sign-up to `/me`, including users arriving directly at `/sign-in`. The UserButton provides account/sign-out controls and sign-out returns to `/`.

Clerk production requires a domain you own; its production instance cannot use a `*.vercel.app` domain. Configure a custom domain and the required DNS records before enabling production authentication. The current Vercel URL can remain an anonymous recruiter demo. Clerk development keys can be used for non-production preview testing on Vercel-generated domains. See [Clerk’s Vercel deployment guide](https://clerk.com/docs/guides/development/deployment/vercel).

References: [Clerk App Router integration](https://clerk.com/docs/nextjs/getting-started/quickstart), [Next.js 15 middleware naming and resource checks](https://clerk.com/docs/reference/nextjs/clerk-middleware), [prebuilt sign-in-or-up page](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page), [Google development/production configuration](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google).

## Validation and remaining work

The automated suite includes missing-session 401s, subject mapping, owner spoofing, cross-owner mutations, identical IDs in separate partitions, empty initialization, local reloads, temporary-store limits, demo separation, unchanged outcome/evidence rules, dependency boundaries and initial HTML rendering. All original 84 tests remain intact.

Production-build checks cover anonymous `/`, meaningful raw HTML without JavaScript, public demo API/workflows, `/me` redirect and private API 401s. Without real Clerk keys, an actual Google OAuth round trip, configured Clerk session validation and sign-out/account switching against Clerk cannot be certified; run those checks after configuration. No test-only authentication bypass exists in production code.

This milestone provides authenticated owner isolation, not a complete production authorization platform. Durable storage, account deletion/data retention policies, operational controls and server-enforced multi-user sharing remain future work. There are no external verification or wearable integrations. Private routes use noindex metadata, but privacy is enforced by the session checks, not by robots instructions. The next milestone is a DynamoDB adapter preserving the current owner partition and atomic outcome/evidence transaction contracts.

Dependency audit: the installed Next.js 15 dependency tree still reports two production findings involving its existing PostCSS dependency (one high, one moderate). Clerk introduced no production advisory in this check. A framework/dependency remediation should be reviewed separately; no unrelated major Next.js upgrade was included in this milestone.

## Implementation inventory and verification

Created files:

- `.env.example`, `middleware.ts`
- `app/(account)/layout.tsx`, `app/(account)/sign-in/[[...sign-in]]/page.tsx`, `app/(account)/me/page.tsx`
- `app/api/me/profile-state/route.ts`
- `application/authenticated-identity.ts`, `application/empty-profile.ts`
- `components/ApplicationProviders.tsx`, `components/auth/OwnerSession.tsx`, `components/owner/OwnerProfile.tsx`
- `server/auth-configuration.ts`, `server/clerk-identity.ts`, `server/owner-identity.ts`, `server/owner-backend.ts`, `server/owner-operations.ts`, `server/owner-http.ts`
- `persistence/temporary-owner-store.ts`
- `tests/authentication.test.cjs`, `tests/first-load.test.cjs`
- `docs/authentication-v1.md`

Modified files:

- `app/layout.tsx`, `app/globals.css`, `components/DemoIntroduction.tsx`, `components/commitments/CommitmentProvider.tsx`
- `application/profile-service.ts`, `server/commands.ts`, `server/request-boundary.ts`
- `package.json`, `package-lock.json`, `tests/helpers/load-typescript.cjs`
- `README.md`, `docs/backend-v1.md`

Validation completed: **99 passing tests** (the original 84 plus 15 focused tests), lint, TypeScript, production build and `git diff --check`. The root page remains statically prerendered; account pages/private API are dynamic. No `domain/*` changes or Clerk imports in domain/application; the public demo API, runtime selection and demo adapter are unchanged.

A local production build in public-demo mode returned HTTP 200 for anonymous Home, with all required product copy in HTML outside scripts and exactly one intro. Private GET/POST returned 401/no-store even with forged ownership inputs; `/me` redirected to `/sign-in`. Browser checks passed for the public profile CTA, permissions, Employer View As, commitment creation/completion, evidence audit and simulated verification request. Desktop/tablet/mobile had no horizontal overflow. The Google entry link reached the honest unconfigured-sign-in state. Real Clerk/Google success paths remain unverified until credentials are supplied.

Recommended commit: `feat: add Google authentication and profile ownership`.
