# Ludcount Handoff

## Post-release invitation and public-demo hardening

The repository now prepares a separately deployable invitation-aware release.
It has not been deployed, and no Firebase Console setting was changed.

- Public email/password registration UI and client signup code were removed.
- Existing email/password and Google users retain sign-in; password reset
  remains available.
- `auth/admin-restricted-operation` maps to exact Czech and English
  invitation-only messages.
- An optional public access-request action is configured with
  `VITE_ACCESS_REQUEST_URL`.
- A first-time Google result is rejected before application user state is
  exposed, with best-effort identity deletion and sign-out fallback. This is
  defense in depth only; Firebase Authentication's end-user account-creation
  setting is the required backend control.
- `/demo` has an explicit provider tree and a dedicated in-memory
  `DemoTransactionRepository`. It mounts no Auth or household provider and
  performs no Firebase requests.
- The fictional Czech fixture covers income and expenses across categories and
  months. Normal forms, list operations, filters, search, duplication, locale
  switching, deletion, and CSV export work in demo mode.
- Demo mutations reset on reload or through an explicit Reset action. A
  persistent localized banner and Exit action distinguish the mode.
- Optional reCAPTCHA Enterprise App Check client initialization is prepared
  through `VITE_FIREBASE_APP_CHECK_SITE_KEY`; enforcement remains off. Local
  debug-provider support uses a boolean switch and stores no debug token.
- Firestore rules and the production data model were not changed.
- Operational details are in `docs/public-access.md`.

Final local verification:

- `npm run format:check`: passing
- `npm run lint`: passing
- `npm run typecheck`: passing
- `npm test`: 50 tests passing
- `npm run test:rules`: 33 tests passing against the isolated Firestore emulator
- `npm run test:browser`: 20 tests passing across desktop, standard mobile,
  320px mobile, and mobile landscape Chromium
- `npm run build`: passing (with the existing Firebase vendor chunk-size
  advisory)

Before this build can safely become the invitation-only production release:

1. configure a real `VITE_ACCESS_REQUEST_URL`
2. explicitly authorize and deploy the tested Hosting build
3. verify existing-user sign-in and the local demo on the deployed origin
4. explicitly authorize the manual Console action at **Authentication →
   Settings → User actions → disable end-user account creation**
5. re-test existing providers and rejected new-user enrollment

The current production site continues to serve the earlier application commit
until a later deployment is authorized.

## First production release

The first Ludcount MVP production release completed on 2026-07-29 from
application commit `11a1ecf2051749d02d299be40ad1ff54821d2c07`.

- Hosting is live at:
  - `https://ludcount-hanenashi.web.app`
  - `https://ludcount-hanenashi.firebaseapp.com`
- The `transactions` composite index for descending `dateKey` and `createdAt`
  is deployed and reports `READY`.
- The live `cloud.firestore` release uses the repository's tested
  `firestore.rules` exactly. Both the local and deployed source have SHA-256
  `7889dcfc1758adc2c65f6dbe018e7ce71cdf5596f5bde2701ed840ca9e7bf556`.
- Unauthenticated production Firestore access was directly verified to return
  HTTP 403.
- The owner production smoke test passed personal-household bootstrap,
  income/expense creation, reload persistence, editing, explicit-save
  duplication, combined month/type/category/note filtering, localized CSV
  export with a UTF-8 BOM, locale persistence, and transaction cleanup.
- A separate production account received only its own personal household.
  Direct requests to both smoke-owner households and their transactions
  returned HTTP 403 for that account.
- Desktop Chromium, 390x844 mobile, 320x700 mobile, and 844x390 mobile
  landscape passed without horizontal overflow. Forms, filters, settings, and
  transaction controls remained reachable.
- Google sign-in opens the official `accounts.google.com` flow from the
  deployed hostname. Completing the account chooser remains a manual
  credentialed smoke check and must not be reported as completed yet.
- The Authentication authorized-domain list already contains `localhost`,
  `ludcount-hanenashi.firebaseapp.com`, and
  `ludcount-hanenashi.web.app`. No authorized-domain Console change is
  currently required.
- Three dedicated smoke user profiles and personal households remain in
  production: two owner-run workspaces (one from an interrupted Playwright
  harness run) and one non-member workspace. All smoke transactions were
  deleted; no other application data was created.
- No billing, Cloud Functions, Storage, Analytics, App Check, App Hosting, or
  other Firebase service was enabled.

## Completed phases

- Phase 1: local vertical slice in commit `42729a3`
- Phase 2: Firebase persistence in commit `8af4299`
- Phase 3: production Firestore Security Rules and emulator-backed allow/deny
  coverage in commit `9a7cf0b`
- Phase 4: filters, note search, transaction duplication, and CSV export in
  commit `56075ec`
- Phase 5: pre-deployment accessibility, responsive, error, Hosting, and
  metadata polish in the current Phase 5 commit

## Phase 5 pre-deployment result

- Added skip links and SPA route focus/scroll management.
- Added solid high-contrast focus indicators and adjusted the primary red so
  normal-size status text and white-on-red controls meet WCAG AA contrast.
- Added semantic filter grouping, transaction lists/action groups, contextual
  localized action names, pressed states, and live regions for loading,
  connectivity, results, empty states, saving, errors, and validation.
- Added a keyboard-safe delete dialog with initial focus, Tab/Shift+Tab
  containment, Escape dismissal, and trigger focus restoration.
- Validation now focuses the first invalid transaction field and exposes
  associated live error messages.
- Expanded safe authentication error mapping and separated Firestore timeouts
  from offline failures. Raw Firebase messages remain internal.
- Added safe sign-out and locale-saving failure states.
- Increased touch targets and polished transaction forms, filters, settings,
  authentication, 320px mobile, and mobile-landscape layouts.
- Added Firebase Hosting configuration for `dist` with an SPA rewrite.
- Added Czech-first title/description/theme metadata, a favicon, app icon, and
  web app manifest. No service worker or offline caching claim was added.
- Documented the current built-in category behavior and exact future
  custom/archive schema and rule changes in `docs/category-management.md`.
- Documented authorized domains and the exact future index, rules, Hosting, and
  smoke-test order in `docs/production-release.md`.
- Phase 5 itself did not deploy or modify Firebase Console. The separately
  authorized first production release is recorded above.

## Phase 4 result

- Added combinable month, transaction-type, category, and case-insensitive note
  filters.
- Kept filters in a compact collapsed panel that expands to a responsive
  single-column layout on small screens.
- Added a reset action that returns to the current local month and clears every
  secondary filter.
- Added a localized empty-results message and visible result count.
- Added transaction duplication through the create form. Amount, type,
  category, and note are copied, the local date defaults to today, and no
  Firestore write occurs before explicit Save.
- Added fully client-side CSV export for the currently filtered rows with:
  - UTF-8 BOM
  - semicolon delimiters
  - Czech or English headers and labels based on the current locale
  - fixed two-decimal amounts sourced from integer minor units
  - deterministic `ludcount-YYYY-MM.csv` filenames
  - correct escaping for semicolons, quotes, line breaks, Czech characters, and
    empty notes
- Added focused unit tests for filter combinations, Czech case-insensitive
  search, duplication, and CSV output.
- Added an emulator-backed Playwright workflow covering filtering, empty
  results, reset, explicit-save duplication, filtered CSV download, BOM
  verification, and horizontal-overflow checks on desktop and mobile Chromium.
- Did not add category management, deploy anything, modify Firebase Console, or
  access production Firestore.

## Phase 3 result

- Replaced the repository's deny-all `firestore.rules` source with strict rules
  for:
  - `users/{uid}`
  - `households/{householdId}`
  - `households/{householdId}/members/{uid}`
  - `households/{householdId}/transactions/{transactionId}`
- Kept the actually deployed Firebase project unchanged. No rules, indexes, or
  application code were deployed.
- Added the Firebase Rules Unit Testing library and a dedicated
  `npm run test:rules` workflow.
- Added `firebase.rules-test.json`, which starts only Firestore on port `8081`
  with the isolated `demo-ludcount-rules` project ID.
- Kept `firebase.emulators.json` and `firestore.emulator.rules` explicitly
  development-only for local UI and Playwright workflows.
- Tested the strict rules as a separate candidate before promoting the exact
  passing policy into `firestore.rules`.
- Ran the complete Playwright signup, atomic household bootstrap,
  create/reload/edit/delete, and locale-persistence flow against an emulator
  loaded with the strict production rules.
- Added 32 allow/deny tests covering authentication, profiles, households,
  memberships, transactions, ownership, creator immutability, integer money,
  dates, month consistency, timestamps, roles, and unexpected fields.

## Final rule boundaries

### User profiles

- Unauthenticated access is denied.
- A user may read only `users/{theirUid}`.
- Initial profile creation must be part of a valid atomic personal-household
  bootstrap and the stored email must match the authentication token.
- Only `locale`, `activeHouseholdId`, and `updatedAt` may change.
- Locale is limited to `cs` or `en`.
- An active household must contain that user as a member.
- Display name, email, creation timestamp, and arbitrary extra fields cannot be
  changed.

### Households

- Only members may read a household.
- Creation requires the authenticated user to be the owner and to create the
  matching owner membership atomically.
- Only the owner may update household settings.
- `ownerId` and `createdAt` are immutable.
- Currency is currently restricted to `CZK`.
- Required types, timestamps, length limits, and exact fields are enforced.
- Household deletion is denied.

### Memberships

- Only existing household members may read membership documents.
- Initial owner membership must match both the authenticated user and the
  atomically created household owner.
- Existing owners may add only non-owner members.
- Non-owners cannot grant themselves access or escalate roles.
- Owners may change only a non-owner member's display name or remove that
  non-owner member.
- Owner membership and role/joined-at identity fields are immutable.

### Transactions

- Only household members may read or create transactions.
- `createdBy` must equal the authenticated user on creation.
- Only the creator may update or delete a transaction.
- `createdBy` and `createdAt` are immutable.
- Household identity is enforced by the parent document path; a stored
  `householdId` field is rejected.
- The current schema uses `dateKey` and `createdBy`; unexpected aliases such as
  `localDate` and `creatorId` are rejected.
- `amountMinor` must be an integer from `1` through `1,000,000,000`.
- Currency must be `CZK`; type must be `income` or `expense`.
- `dateKey` and `monthKey` must use constrained local calendar shapes and
  describe the same month.
- Required fields, server timestamps, string length limits, and exact field
  sets are enforced.

## Verification

- `npm run format:check`: passing
- `npm run lint`: passing
- `npm run typecheck`: passing
- `npm test`: 39 tests passing
- `npm run test:rules`: 32 tests passing against local Firestore only
- `npm run test:browser`: 16 tests passing across desktop, standard mobile,
  320px narrow mobile, and mobile landscape Chromium against local
  Authentication and Firestore emulators
- `npm run build`: passing

Temurin OpenJDK 21.0.12 is active. The normal Firebase CLI 15.24.0 emulator
workflow works.

## Firebase Console and production status

- Email/Password and Google authentication are enabled.
- The tested strict Firestore rules and required composite index are deployed.
- Firebase Hosting serves the reviewed Vite build on both default Hosting
  domains.
- Production contains only the three dedicated smoke user workspaces described
  above, with zero smoke transactions remaining.
- No Firebase Console settings were changed.
- Indexes, rules, and Hosting were deployed in that order. Emulator-only rules
  and configuration were not deployed.

## What to do next

The MVP is live. Remaining release follow-up:

1. manually complete Google sign-in on
   `https://ludcount-hanenashi.web.app` with an authorized Google account
2. decide whether the three dedicated smoke Authentication users and their
   empty personal workspaces should be retained or removed in a separately
   authorized cleanup
3. add any future custom domain to Authentication authorized domains before
   serving sign-in there
4. keep custom and archived categories deferred until their documented schema
   and rule work is explicitly authorized

## Commands

```bash
npm install
npm run dev
npm run emulators
npm run test:rules
```

With development emulators running in another terminal:

```bash
VITE_USE_FIREBASE_EMULATORS=true npm run dev
npm run test:browser
```
