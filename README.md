# Ludcount

Ludcount is a small household income and expense journal. The interface defaults
to Czech and can be switched to English in Settings.

This repository currently implements Phase 2 from
[`battleplan.md`](./battleplan.md). Firebase Authentication creates or loads a
personal household, and transactions and user preferences are synchronized
through Cloud Firestore. Production Firestore remains locked by deny-all
security rules until Phase 3.

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
[`firestore.rules`](./firestore.rules) file is the source of truth and currently
denies every read and write. A signed-in production client therefore shows an
explicit permission-denied state until Phase 3 rules are implemented and
tested.

## Firebase emulators

Start the Authentication and Firestore emulators in one terminal:

```bash
npm run emulators
```

This command intentionally uses `firebase.emulators.json` and
`firestore.emulator.rules`. Those development-only rules allow authenticated
emulator traffic so Phase 2 persistence can be exercised without changing
production `firestore.rules`.

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

## Quality commands

```bash
npm run format
npm run lint
npm run typecheck
npm test
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

## Phase 2 boundaries

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
- Firebase Auth and Firestore emulator configuration
- validated Firebase client initialization

Deferred:

- production Firestore security rules beyond deny-all and their allow/deny tests
- category management, filtering, duplicate, and CSV export
- deployment and hosting
- Cloud Functions, Storage, Analytics, App Check, and billing-dependent features
