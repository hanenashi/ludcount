# Ludcount

Ludcount is a small household income and expense journal. The interface defaults
to Czech and can be switched to English or Japanese in Settings.

This repository implements the Phase 1-5 MVP from
[`battleplan.md`](./battleplan.md). Firebase Authentication creates or loads a
personal household, and transactions and user preferences are synchronized
through Cloud Firestore. Production Firestore access is protected by strict,
emulator-tested membership and field-validation rules. Transaction history
supports combined filters, note search, explicit-save duplication, and
localized client-side CSV export. Overview, Transactions, and Graphs share a
Month/Year/From–To period selector, and the graph compares income with expenses
using daily or monthly buckets. The invitation-only production application
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
- On touch devices, the amount field uses a compact in-app number pad and stays
  read-only to prevent the operating-system keyboard from covering the form.
  Desktop users retain ordinary editable and hardware-keyboard input.
- User-selected dates use local `YYYY-MM-DD` date keys and `YYYY-MM` month keys.
- The documented maximum transaction amount is `1,000,000,000` minor units.

## Transaction history and CSV export

- Month, year, or custom From–To periods combine with type, category, and
  case-insensitive note filters locally over
  the signed-in household's synchronized transactions.
- Reset returns to the current month and clears type, category, and note
  filters.
- Duplicating a transaction opens a create form with copied amount, type,
  category, and note, while the date defaults to today. Nothing is written
  until Save is selected.
- CSV export includes only the currently filtered transactions.
- Settings provides a separate whole-household transaction export regardless
  of the selected period or filters. Its deterministic filename is
  `ludcount-all-YYYY-MM-DD.csv`.
- CSV files are generated entirely in the browser with a UTF-8 BOM, semicolon
  delimiters, localized headers and category/type labels, and deterministic
  `ludcount-YYYY-MM.csv` filenames.

### Okanereco backup conversion

The read-only converter at
[`tools/okane_reco_to_ludcount_csv.py`](./tools/okane_reco_to_ludcount_csv.py)
turns an Okanereco MMJ SQLite backup into two UTF-8 BOM, semicolon-delimited
files: an import-ready Ludcount CSV and a review CSV for deleted or invalid
source rows. It does not connect to Firebase or modify the source database.

```bash
python3 tools/okane_reco_to_ludcount_csv.py MMJ.sqlite ludcount-import.csv \
  --review-output ludcount-review.csv
python3 -m unittest tools.tests.test_okane_reco_to_ludcount_csv
```

A ready-to-import fictional 20-row fixture is available at
[`examples/okane-reco-import-sample.csv`](./examples/okane-reco-import-sample.csv).
It covers income and expenses across three months, repeated and varied
categories, Czech characters, semicolons, and escaped quotes.

The converter preserves the source row ID, local date and time, income/expense
type, category, note, payment ID, and shop ID. Numeric values are converted to
integer minor units without currency conversion. The `currency` column is
`CZK`, matching Ludcount's current storage schema; a saved `¥` display
preference remains presentation-only.

Signed-in household owners can import the canonical output from Settings. The
browser validates and previews the file locally before showing an explicit
confirmation. Imported categories and transactions use deterministic document
IDs, and each write chunk checks Firestore for existing documents, so selecting
the same file again safely skips previously imported rows. Categories are
created before their transactions. The importer accepts at most 5 MiB and
10,000 rows per file; larger migrations can be split without changing source
IDs. Signed numeric source-category IDs are supported because Okanereco uses
negative IDs for some system categories. Import is unavailable in the
backend-free demo and to non-owner members.

Firestore writes are grouped by category and capped at 100 documents per
transaction. This keeps strict membership/category rule lookups below
Firestore's aggregate access-call limit even for multi-thousand-row imports.
Progress advances after every committed chunk. If a connection or write fails,
selecting the same file again skips deterministic documents already saved and
continues with the remainder.

The source time is retained in the CSV for audit purposes but is not part of
Ludcount's transaction schema. Ludcount preserves the source local calendar
date and records the actual import time in Firestore `createdAt`/`updatedAt`.
The localized six-column Ludcount export is intended for spreadsheets and
external backup; it is not the canonical 12-column Okanereco import format.

## Bulk transaction deletion

The household owner can delete every transaction from Settings after typing
`DELETE` in an alert dialog. This operation deletes transaction documents in
bounded Firestore batches. It deliberately retains the Firebase user, household
document, membership, preferences, and custom categories, so a cleared
household remains usable and a previously imported CSV can be imported again.
Firestore rules allow this bulk cleanup only to the household owner; ordinary
members can still delete only transactions they created.

## Periods and graphs

- Clicking the current period on Overview, Transactions, or Graphs opens the
  same accessible Month/Year/From–To chooser.
- The selection is shared while navigating between those sections. Previous and
  next controls move by one month, one year, or one custom-range duration.
- The graph displays paired income and expense bars. Month and short custom
  ranges use daily buckets; years and longer custom ranges use monthly buckets.
- Separate income and expense pie charts break the selected period down by
  category. Slices below 5% are combined into a localized Other segment, and
  crowded charts show at most six slices.
- A visible interval-value list accompanies the chart for precise values and
  each pie has an exact amount-and-percentage legend for assistive-technology
  access. Empty periods have localized states.
- All aggregation remains client-side over the household's synchronized
  transactions; no Firestore query, schema, index, or rule change is required.

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
- shared month, year, and custom-range selection with income/expense graphs
- explicit-save transaction duplication with today's local date
- Czech/English/Japanese client-side CSV export of the filtered result set
- preview-first, idempotent owner import of canonical Okanereco CSV files
- whole-household CSV export and owner-confirmed bulk transaction deletion
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

The invitation-only production release is live. The current Hosting build was
deployed on 2026-08-02 from application commit
`75da4250e413bf3b2b38eea67c35064f1803c62b`. End-user account creation is
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
smoke-test order. Verified chronological deployment and migration notes are in
the [newest-first release history](./docs/releases/README.md); the root
[`handoff.md`](./handoff.md) intentionally contains only current operational
state and next work.
