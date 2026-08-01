# Ludcount Handoff

## Project status

Ludcount is a live, invitation-only household income and expense journal built
with React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, and
Firebase Hosting. The UI defaults to Czech and also supports English and
Japanese. Production is operational; development continues through focused,
tested Hosting releases.

## Production

- Primary URL: <https://ludcount-hanenashi.web.app/>
- Alternate URL: <https://ludcount-hanenashi.firebaseapp.com/>
- Firebase project: `ludcount-hanenashi`
- Current deployed application commit: `125e8417aa1183ac63854e207e80b42ba26632b0`
- Current repository HEAD: [`main`](https://github.com/hanenashi/ludcount/commits/main)
- Repository baseline before the current focus/documentation task:
  `c18b54d52ac59ef731e66b996c7c6a4ba14c3e98`

The live `main` link is the source of truth for repository HEAD because a Git
commit cannot embed its own final SHA. Application and later documentation-only
commits are distinguished in the [release history](docs/releases/README.md).

## Firebase, Authentication, and App Check

- Email/password and Google providers are enabled for existing users.
- End-user account creation is disabled in Firebase Authentication, enforcing
  invitation-only enrollment at the backend.
- Password reset remains available.
- Authorized domains include both default Hosting domains and `localhost`.
- App Check reCAPTCHA Enterprise client support is prepared through Vite
  environment variables, but production enforcement remains off.
- No Cloud Functions, Storage, Analytics, App Hosting, billing, or service
  worker is enabled.
- The public `/demo` route mounts separate in-memory repositories and performs
  no Firebase Auth, Firestore, token, Installations, or App Check requests.

## Data model and security boundaries

Production data uses:

```text
users/{uid}
households/{householdId}
households/{householdId}/members/{uid}
households/{householdId}/transactions/{transactionId}
households/{householdId}/categories/{categoryId}
```

- Money is stored as positive integer minor units; transaction direction is
  `income` or `expense` and stored currency is currently `CZK`.
- Transactions keep local `YYYY-MM-DD` date keys and consistent `YYYY-MM`
  month keys.
- Users can read only their own profile and update only permitted preferences.
- Household documents, memberships, categories, and transactions are readable
  only by members.
- Household owners manage settings, non-owner memberships, and custom
  categories; ownership and role escalation are denied.
- Members create transactions only as themselves. Only a transaction creator
  can update or delete it.
- Firestore rules validate exact fields, types, immutable identities,
  timestamps, integer amount bounds, dates, categories, and currency.
- [`firestore.rules`](firestore.rules) and
  [`firestore.indexes.json`](firestore.indexes.json) are the production sources
  of truth. Emulator-only rules are never deployed.

## Major features

- Czech-first UI with persistent English and Japanese selection
- invitation-only email/password and Google sign-in with password reset
- backend-free fictional public demo with reset and exit actions
- automatic personal household bootstrap for approved users
- persistent income and expense create/edit/delete/duplicate workflows
- built-in plus owner-managed custom and archived categories
- display-symbol preference (`Kč`, `$`, or `¥`) without currency conversion
- shared month/year/custom From–To period selection
- income/expense interval graphs and category pie charts with grouped Other
- combined transaction filters and case-insensitive note search
- localized client-side CSV export with UTF-8 BOM and semicolon delimiters
- compact mobile amount pad; desktop retains hardware-keyboard entry and paste
- responsive and accessibility coverage across desktop and mobile layouts

## Verification

Current expected full-suite counts before the present focused visual fix:

- unit tests: 69 passing
- Firestore rules tests: 38 passing against isolated local Firestore
- Playwright tests: 32 passing across desktop, 390px mobile, 320px mobile, and
  mobile landscape Chromium
- production build: passing

Run the complete gate from the repository root:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run test:browser
npm run build
```

Java 21 or newer is required for the emulator suites. `npm run test:browser`
starts Vite but expects the Authentication and Firestore emulators from
`npm run emulators` to be running separately.

## Known issues and advisories

- Vite reports the existing minified Firebase vendor chunk above 500 kB. This
  is an advisory, not a build failure.
- App Check enforcement remains deliberately off pending an explicitly
  authorized rollout and verified production build.
- There is no service-worker caching or claim of complete offline operation.
- Three dedicated first-release smoke user workspaces were historically left
  empty in production; cleanup requires separately authorized destructive work.
- Category reordering and member-managed category writes remain deferred.

## Exact next recommended work

1. Complete the focused amount-control divider fix and archive split described
   by the current task, then record its deployed application SHA.
2. Decide separately whether to remove the three empty smoke-test users and
   workspaces; inspect exact targets before any destructive action.
3. If additional category work is desired, scope category reordering and
   member permissions together with rules and emulator tests.
4. Roll out App Check only through the documented verify-before-enforce order
   and explicit authorization.

## Documentation

- [Product and engineering contract](battleplan.md)
- [Developer onboarding](README.md)
- [Newest-first release history](docs/releases/README.md)
- [Production release runbook](docs/production-release.md)
- [Invitation-only access, demo, and App Check](docs/public-access.md)
- [Category schema and rule boundaries](docs/category-management.md)
