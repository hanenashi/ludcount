# Ludcount Handoff

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
- Did not deploy, modify Firebase Console, access production Firestore, create
  collections, or change Firestore rules/indexes.

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
- Production Firestore still uses the previously deployed deny-all rules.
- No production Firestore data was created or modified.
- No Firebase Console settings were changed.
- No deployment was performed.

Before a safe production deployment:

1. obtain explicit deployment authorization
2. verify intended Authentication authorized domains
3. run the clean-checkout preflight in `docs/production-release.md`
4. deploy indexes and wait for readiness
5. deploy the reviewed rules, then Hosting
6. perform the documented owner and non-member production smoke tests

## What to do next

The requested Phase 5 pre-deployment polish is complete. Remaining work:

1. decide and explicitly authorize whether to implement the deferred custom and
   archived-category slice
2. review the release runbook and authorize a production release separately
3. add the final production/custom domains to Authentication when known
4. deploy and run live smoke tests only under that future authorization

Production Firestore must remain on its currently deployed deny-all rules until
an explicitly authorized, reviewed rules/index deployment.

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
