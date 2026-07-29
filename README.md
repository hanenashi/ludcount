# Ludcount

Ludcount is a small household income and expense journal. The interface defaults
to Czech and can be switched to English in Settings.

This repository currently implements Phase 4 from
[`battleplan.md`](./battleplan.md). Firebase Authentication creates or loads a
personal household, and transactions and user preferences are synchronized
through Cloud Firestore. Production Firestore access is defined by strict,
emulator-tested membership and field-validation rules. Transaction history now
supports combined filters, note search, explicit-save duplication, and
localized client-side CSV export.

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- Java 21 or newer for the current Firebase Emulator Suite

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Fill every value in `.env`. The application validates all six required Vite
   variables and reports the missing names during development:

   ```text
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

Vite prints the local URL, normally `http://localhost:5173`.

The real `.env` file is ignored by Git. Only the empty `.env.example` template
belongs in version control.

## Firebase Authentication

Before production authentication can work, enable these providers in Firebase
Console under **Authentication → Sign-in method**:

- Email/Password
- Google

Choose a project support email for Google sign-in and add every intended
production hostname under **Authentication → Settings → Authorized domains**.

Do not create Firestore collections manually. The committed production
[`firestore.rules`](./firestore.rules) file is the source of truth. It has not
been deployed: the Firebase project therefore continues using its previously
deployed deny-all rules until a future deployment is explicitly authorized.

## Firebase emulators

Start the Authentication and Firestore emulators in one terminal:

```bash
npm run emulators
```

This command intentionally uses `firebase.emulators.json` and
`firestore.emulator.rules`. Those development-only rules allow authenticated
emulator traffic so local UI workflows remain easy to exercise. They are not
the production security policy.

Start the Vite app against the emulators in a second terminal:

```bash
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```

The emulator-backed browser suite also expects these emulators to remain
running:

```bash
npm run test:browser
```

Default local endpoints:

- Emulator UI: `http://127.0.0.1:4000`
- Authentication: `http://127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`

Emulator state is intentionally ephemeral unless Firebase export/import options
are supplied manually.

## Firestore security rules tests

Run the production rules suite independently:

```bash
npm run test:rules
```

This command:

- starts only a local Firestore emulator on port `8081`
- uses the isolated `demo-ludcount-rules` project ID
- loads the production `firestore.rules` source
- runs the Firebase Rules Unit Testing allow/deny suite
- shuts the emulator down afterward

The `demo-*` project ID prevents accidental fallback to non-emulated Firebase
services. Automated rules tests never use the production project.

The complete Playwright persistence workflow has also been verified locally
against an emulator loaded with `firestore.rules`, proving the real client
bootstrap and transaction writes satisfy the strict policy.

The production rules enforce these boundaries:

- users may read only their own profile and may update only `locale`,
  `activeHouseholdId`, and `updatedAt`
- profile identity fields and creation timestamps are immutable
- only members may read a household, its memberships, and its transactions
- a new personal household, owner membership, and profile must be created
  atomically by that authenticated owner
- only owners may update household settings or manage non-owner memberships;
  ownership and roles cannot be escalated
- members may create transactions only as themselves
- transaction creators may update or delete their own transactions; other
  members have read-only access to them
- transaction fields, integer amounts, CZK currency, local date/month keys,
  timestamps, and exact field sets are validated

## Quality commands

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
```

Run `npm run test:browser` separately while the emulators are active, as shown
above.

No deployment command is configured in this phase.

## Money and dates

- Money is stored and aggregated as integer minor units. For example, `12550`
  means `125.50 CZK`.
- Transaction direction is represented by `income` or `expense`; stored amounts
  are always positive.
- User-selected dates use local `YYYY-MM-DD` date keys and `YYYY-MM` month keys.
- The documented maximum transaction amount is `1,000,000,000` minor units.

## Transaction history and CSV export

- Month, type, category, and case-insensitive note filters combine locally over
  the signed-in household's synchronized transactions.
- Reset returns to the current month and clears type, category, and note
  filters.
- Duplicating a transaction opens a create form with copied amount, type,
  category, and note, while the date defaults to today. Nothing is written
  until Save is selected.
- CSV export includes only the currently filtered transactions.
- CSV files are generated entirely in the browser with a UTF-8 BOM, semicolon
  delimiters, localized headers and category/type labels, and deterministic
  `ludcount-YYYY-MM.csv` filenames.

## Phase 4 boundaries

Included:

- automatic personal household creation after first sign-in
- typed Firestore converters and focused household/transaction repositories
- persistent transactions, active household preference, and user locale
- explicit loading, offline, permission-denied, and write-failure states
- Firebase email/password and Google authentication, password reset, and
  sign-out
- Czech-first UI with persistent English selection
- responsive overview, transaction list, and settings screens
- transaction creation, editing, deletion, totals, and localized categories
- combined transaction filters and case-insensitive note search
- explicit-save transaction duplication with today's local date
- Czech/English client-side CSV export of the filtered result set
- Firebase Auth and Firestore emulator configuration
- validated Firebase client initialization
- production Firestore rules for profiles, households, memberships, and
  transactions
- 32 emulator-backed allow/deny rules tests using the Firebase Rules Unit
  Testing library

Deferred:

- category management and archived-category handling
- Phase 5 accessibility and production-polish work
- deployment and hosting
- Cloud Functions, Storage, Analytics, App Check, and billing-dependent features

## Before production deployment

No Firebase deployment has been performed. Before deploying safely:

1. review the committed rules and passing rules-test output
2. confirm intended production hostnames are authorized for Authentication
3. confirm any existing production documents conform to the exact Phase 3 field
   contracts
4. explicitly authorize and perform a rules/index deployment
5. run a production smoke test with separate owner and non-member accounts

Keep the currently deployed deny-all policy in place until those checks and
deployment authorization are complete.
