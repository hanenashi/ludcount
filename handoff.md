# Ludcount Handoff

## What was completed

- Read and followed `battleplan.md`.
- Implemented and committed the Phase 1 local vertical slice in commit
  `42729a3` (`feat: implement Phase 1 local vertical slice`).
- Created a React, TypeScript, and Vite application.
- Added a Czech-first UI with a persistent English option in Settings.
- Added Firebase client initialization with required environment validation.
- Added email/password authentication, Google authentication, password reset,
  and sign-out.
- Added Firebase Authentication and Firestore emulator configuration.
- Kept production Firestore locked with deny-all `firestore.rules`.
- Added in-memory transaction creation, editing, deletion, monthly totals,
  localized default categories, and responsive desktop/mobile layouts.
- Added integer-minor-unit money helpers and local calendar date helpers.
- Added formatting, linting, TypeScript, Vitest, Playwright, and production-build
  tooling.
- Created the local `.env`, confirmed it is ignored, and committed an empty
  `.env.example`.
- No deployment or production Firestore data creation was performed.

## Current status

- `npm run format:check`: passing
- `npm run lint`: passing
- `npm run typecheck`: passing
- `npm test`: 12 tests passing
- `npm run build`: passing
- Playwright desktop and mobile workflow: passing with no console errors
- Authentication emulator: verified
- Full Firestore emulator startup requires Java 21; the current workspace has
  Java 17.

Transactions are intentionally stored in memory and reset after a page reload.

## Manual Firebase Console work

- Enable Email/Password authentication.
- Enable Google authentication and select a project support email.
- Add intended production hostnames to Authentication authorized domains.
- Do not manually create Firestore collections.

## What to do next

Proceed with Phase 2 from `battleplan.md`:

1. Install or select Java 21 and verify the complete Auth + Firestore Emulator
   Suite.
2. Add automatic personal household creation after first sign-in.
3. Replace the in-memory transaction repository with focused Firestore
   repositories and converters.
4. Persist user locale and active household preferences.
5. Add loading, offline, permission, and write-error states.
6. Keep production Firestore deny-all until Phase 3 rules and emulator-based
   allow/deny tests are implemented.
7. Run formatting, lint, TypeScript, tests, the production build, and responsive
   browser QA again.

Do not deploy yet unless the user explicitly changes the scope.

## Local commands

```bash
npm install
npm run dev
```

With Java 21:

```bash
npm run emulators
```

In another terminal:

```bash
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```
