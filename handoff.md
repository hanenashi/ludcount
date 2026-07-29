# Ludcount Handoff

## Completed phases

- Phase 1: local vertical slice in commit `42729a3`
- Phase 2: Firebase persistence in commit `8af4299`
- Phase 3: production Firestore Security Rules and emulator-backed allow/deny
  coverage in commit `9a7cf0b`
- Phase 4: filters, note search, transaction duplication, and CSV export in the
  current Phase 4 commit

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
- `npm test`: 31 tests passing
- `npm run test:rules`: 32 tests passing against local Firestore only
- `npm run test:browser`: 6 tests passing on desktop and mobile Chromium against
  local Authentication and Firestore emulators
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

1. review the strict rules and test evidence
2. add intended production hostnames to Authentication authorized domains
3. confirm any existing production documents match the exact field contracts
4. explicitly authorize deployment of Firestore rules and indexes
5. smoke-test production with separate owner and non-member accounts

## What to do next

Phase 5 is next in `battleplan.md`, but deployment still requires separate,
explicit authorization. Before any deployment work:

1. complete the remaining accessibility and responsive polish
2. review production error handling and any required indexes
3. decide when to implement the Phase 3 category-management and
   archived-category work that remained outside the strict rules request
4. prepare deployment documentation and hosting configuration without
   deploying unless explicitly authorized

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
