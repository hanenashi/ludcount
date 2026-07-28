# Ludcount Handoff

## What was completed

- Read and followed `battleplan.md`.
- Phase 1 remains available in commit `42729a3`.
- Implemented Phase 2:
  - automatically creates a personal household, owner membership, and user
    profile in one Firestore transaction after first sign-in
  - loads the existing active household on subsequent sign-ins
  - persists user locale and active household preference in the user profile
  - replaces application-level in-memory transaction storage with a focused
    Firestore repository and realtime subscription
  - adds typed converters with runtime validation for profiles, households,
    members, and transactions
  - preserves positive integer minor-unit amounts and local `YYYY-MM-DD` /
    `YYYY-MM` date keys
  - adds explicit loading, offline, permission-denied, pending-write, and
    write-failure UI states in Czech and English
- Added a separate `firebase.emulators.json` and
  `firestore.emulator.rules` for Phase 2 development. These emulator-only rules
  allow authenticated traffic.
- Kept the production `firestore.rules` file unchanged and deny-all.
- Added the required Firestore composite index as version-controlled code.
- Added unit coverage for converters, error normalization, data states, money,
  dates, totals, repositories, and transaction form failure behavior.
- Added emulator-backed Playwright coverage for first sign-in bootstrap,
  transaction create/reload/edit/delete, Firestore-backed locale hydration,
  Czech-first authentication, responsive desktop/mobile layouts, and browser
  console errors.
- Updated `README.md` with the Phase 2 architecture, emulator workflow, quality
  commands, and boundaries.
- No deployment, production Firestore writes, manual collection creation, or
  production rule relaxation was performed.

## Verification

- `npm run format:check`: passing
- `npm run lint`: passing
- `npm run typecheck`: passing
- `npm test`: 21 tests passing across 8 files
- `npm run test:browser`: 4 Playwright tests passing across desktop and mobile
  Chromium against local Auth and Firestore emulators
- `npm run build`: passing
- Desktop and mobile screenshots were visually checked with no layout issue
  found.

The installed Java is Temurin OpenJDK 17.0.19. The committed Firebase CLI
version (`firebase-tools` 15.24.0) requires Java 21, so `npm run emulators`
cannot currently start with the installed Java. Full local emulator and browser
verification was completed without changing system Java by temporarily invoking
Firebase CLI 14.27.0. Install or select Java 21 before using the committed
Firebase CLI normally.

## Current data model

- `users/{uid}` stores display name, email, locale, and `activeHouseholdId`.
- `households/{householdId}` stores the personal household and CZK currency.
- `households/{householdId}/members/{uid}` stores the owner membership.
- `households/{householdId}/transactions/{transactionId}` stores transactions
  with positive integer `amountMinor`, `currency: "CZK"`, local date/month keys,
  category snapshot, creator, and timestamps.

The application does not use the Phase 1 in-memory repository for persistence.
That small repository remains only as a unit-test utility.

## Firebase Console status

Email/Password and Google authentication are already enabled.

Before a future production release:

- add intended production hostnames to Authentication authorized domains
- do not manually create Firestore collections
- do not enable Cloud Functions, Storage, Analytics, App Check, or
  billing-dependent features unless a later phase explicitly requires them

## What to do next

Proceed with Phase 3 from `battleplan.md`:

1. Install or select Java 21.
2. Replace the emulator-only broad authenticated rule with production household
   membership and field-validation rules in `firestore.rules`.
3. Add explicit allow/deny emulator tests for owners, members, non-members,
   unauthenticated users, immutable ownership fields, integer money, valid local
   dates, and permitted user preference updates.
4. Keep deny-all production rules in place until those tests pass and deployment
   is explicitly authorized.
5. Do not deploy unless the user explicitly requests it.

## Local commands

```bash
npm install
npm run dev
```

With Java 21, start Auth and Firestore emulators:

```bash
npm run emulators
```

In another terminal, run the app against them:

```bash
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```

With the emulators still running, execute browser tests:

```bash
npm run test:browser
```
