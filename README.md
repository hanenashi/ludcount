# Ludcount

Ludcount is a small household income and expense journal. The interface defaults
to Czech and can be switched to English or Japanese in Settings.

This repository implements the Phase 1-5 MVP from
[`battleplan.md`](./battleplan.md). Firebase Authentication creates or loads a
personal household, and transactions and user preferences are synchronized
through Cloud Firestore. Production Firestore access is protected by strict,
emulator-tested membership and field-validation rules. Transaction history
supports combined filters, note search, explicit-save duplication, and
localized client-side CSV export. The invitation-only production application
also includes a fully local public demo at `/demo` and is available on Firebase
Hosting at `https://ludcount-hanenashi.web.app`.

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

   Optional public configuration:

   ```text
   VITE_ACCESS_REQUEST_URL
   VITE_FIREBASE_APP_CHECK_SITE_KEY
   VITE_FIREBASE_APP_CHECK_DEBUG
   ```

   The access-request value accepts an `https:` or `mailto:` URL. The App Check
   site key is used only when App Check is deliberately configured. Set the
   debug flag only for local emulator/test work; never commit a generated App
   Check debug token.

4. Start the app:

   ```bash
   npm run dev
   ```

Vite prints the local URL, normally `http://localhost:5173`.

The real `.env` file is ignored by Git. Only the empty `.env.example` template
belongs in version control.

## Firebase Authentication

The production project has these providers enabled:

- Email/Password
- Google

The application is designed for invitation-only access:

- public email/password registration UI is removed
- existing users retain provider sign-in and password reset
- restricted signup errors receive localized invitation-only copy
- an optional access-request action comes from `VITE_ACCESS_REQUEST_URL`

Backend enforcement still requires the manual Firebase Console setting
**Authentication → Settings → User actions → disable end-user account
creation**. Client-side hiding or Google-result cleanup is not an authorization
boundary. The complete invitation workflow, manual user creation, Google
provider limitation, demo guarantees, and App Check rollout are documented in
[`docs/public-access.md`](./docs/public-access.md).

The authorized-domain list contains `ludcount-hanenashi.firebaseapp.com`,
`ludcount-hanenashi.web.app`, and `localhost`. Add every future custom hostname
under **Authentication → Settings → Authorized domains** before serving sign-in
there.

Do not create Firestore collections manually. The committed production
[`firestore.rules`](./firestore.rules) file is the source of truth. The exact
tested file is deployed to production. Future rule changes must pass the local
rules suite and follow the controlled release order before deployment.

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

The public demo is always available at `/demo` and uses only an in-memory
repository. It does not require Firebase emulators or credentials.

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
  `displayCurrency`, `activeHouseholdId`, and `updatedAt`
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
- household members may read custom categories; only the owner may create,
  rename, archive, or restore them
- new transactions may use only a matching built-in category or an active
  custom category from the same household

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

Deployment commands are documented for controlled future releases. They must
not be run as part of ordinary local development.

## Money and dates

- Money is stored and aggregated as integer minor units. For example, `12550`
  means `125.50 CZK`.
- Amount symbols default from the UI locale: Czech uses `Kč`, English uses
  `$`, and Japanese uses `¥`. Each user can save an automatic or explicit
  `Kč`/`$`/`¥` display preference in Settings.
- Symbol changes are presentation-only. They do not convert or modify numeric
  values, transaction documents, or the underlying `CZK` field; CSV export
  continues to report that stored currency accurately.
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

## Accessibility and responsive behavior

- A skip link, route heading focus, visible high-contrast focus indicators, and
  localized names support keyboard and screen-reader navigation.
- Loading, offline, timeout, permission, save, validation, result, error, and
  empty states use appropriate live-region semantics.
- The delete dialog traps focus, closes with Escape, and restores focus to its
  trigger when the trigger remains available.
- Interactive touch targets are at least 44 CSS pixels where practical.
- Desktop, standard mobile, 320px mobile, and mobile landscape Chromium
  viewports are covered by Playwright without horizontal overflow.

## Categories

The built-in catalog remains defined in source with stable IDs such as
`expense.groceries` and localized Czech, English, and Japanese labels. Household
owners can also create, rename, archive, and restore custom income or expense
categories. Members can read and use active categories; custom names remain
literal rather than translated. Archived categories stay visible in history but
cannot be selected for new transactions.

The Firestore schema, archive semantics, demo behavior, and owner/member rule
boundaries are documented in
[`docs/category-management.md`](./docs/category-management.md).

## Hosting and application metadata

- Firebase Hosting is configured to serve `dist`.
- Unknown paths rewrite to `index.html` for the Vite React SPA.
- The app includes Czech-first description metadata, a favicon, SVG app icon,
  web app manifest, application name, and theme colors.
- There is intentionally no service worker. Firestore caching does not make the
  complete authentication and write workflow available offline.

## MVP boundaries

Included:

- automatic personal household creation after first sign-in
- typed Firestore converters and focused household/transaction repositories
- persistent transactions, active household preference, and user locale
- explicit loading, offline, permission-denied, and write-failure states
- Firebase email/password and Google authentication, password reset, and
  sign-out
- Czech-first UI with persistent English and Japanese selection
- responsive overview, transaction list, and settings screens
- transaction creation, editing, deletion, totals, built-in localized
  categories, and owner-managed custom categories
- combined transaction filters and case-insensitive note search
- explicit-save transaction duplication with today's local date
- Czech/English/Japanese client-side CSV export of the filtered result set
- keyboard navigation, dialog focus management, accessible validation, and
  live status announcements
- narrow-mobile and landscape responsive polish
- localized authentication, permission, offline, timeout, and fallback errors
- Firebase Hosting SPA configuration and application metadata
- Firebase Auth and Firestore emulator configuration
- validated Firebase client initialization
- production Firestore rules for profiles, households, memberships, categories,
  and transactions
- 38 emulator-backed allow/deny rules tests using the Firebase Rules Unit
  Testing library
- explicit invitation-only sign-in UX and a fully local fictional demo

Deferred:

- category reordering and member-managed categories
- service-worker caching and full offline support
- Cloud Functions, Storage, Analytics, App Check enforcement, and
  billing-dependent features

## Production status and future releases

The invitation-only production release is live. The current Hosting build and
display-preference rules were deployed on 2026-08-01 from application commit
`72687669ce74a1e7f5b8c4b70f2d01ccda19d02e`. End-user account creation is
disabled in Firebase Authentication.

- Hosting: `https://ludcount-hanenashi.web.app`
- Alternate default domain: `https://ludcount-hanenashi.firebaseapp.com`
- Firestore rules: the exact emulator-tested repository source
- Firestore indexes: the required transactions index is ready

Existing email/password and Google users passed credentialed live sign-in
checks. The production signup endpoint rejects unknown email/password
enrollment with `ADMIN_ONLY_OPERATION`, unknown Google enrollment was manually
verified not to bootstrap a household, and the deployed demo completes with
zero Firebase requests.

Use [`docs/production-release.md`](./docs/production-release.md) for every
future controlled release. Preserve its index → readiness → rules → Hosting →
smoke-test order.
