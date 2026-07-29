# Production Release Runbook

This runbook was used for the first production release on 2026-07-29. It does
not authorize another deployment. Production currently serves application
commit `11a1ecf2051749d02d299be40ad1ff54821d2c07` with the repository's tested
Firestore rules and required index.

## Authentication domains

Before every release, verify these entries under Firebase Authentication
authorized domains:

- `ludcount-hanenashi.firebaseapp.com`
- `ludcount-hanenashi.web.app`
- `localhost` only when real-project local authentication is intentionally used
- every exact custom hostname that will serve the app, including separate apex
  and `www` names where applicable

The two default Hosting domains and `localhost` were verified for the first
release. Do not add future custom domains until the intended hostname is known
and its release is explicitly authorized.

## Preflight

From a clean checkout:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
```

With local Authentication and Firestore emulators running:

```bash
npm run emulators
npm run test:browser
```

Confirm the active CLI target before any future deployment:

```bash
firebase use
firebase projects:list
```

The intended project ID is `ludcount-hanenashi`. Stop if the selected project is
different.

For an invitation-only release, also confirm:

- `VITE_ACCESS_REQUEST_URL` contains the reviewed public contact or request URL
- the authentication screen has no registration action
- `/demo` completes without Firebase network traffic
- App Check enforcement remains off unless separately authorized
- no App Check debug token is tracked or included in the production build

See [`public-access.md`](./public-access.md) for the enrollment and App Check
operational boundaries.

## Authorized release order

Only after explicit authorization for a future release:

1. Deploy indexes:

   ```bash
   firebase deploy --only firestore:indexes --project ludcount-hanenashi
   ```

2. Wait until every required index reports ready. Do not open data access while
   an application query still depends on a building index.

3. Deploy the reviewed and emulator-tested rules:

   ```bash
   firebase deploy --only firestore:rules --project ludcount-hanenashi
   ```

4. Build the exact reviewed source and deploy Hosting:

   ```bash
   npm ci
   npm run build
   firebase deploy --only hosting --project ludcount-hanenashi
   ```

5. Smoke-test the deployed application:

   - sign in with a pre-created dedicated production test account
   - verify the personal household bootstrap
   - create, edit, duplicate, filter, export, and delete a small transaction
   - switch Czech to English and verify persistence
   - verify a separate non-member account cannot read the household
   - confirm no raw Firebase error appears in the UI or browser console
   - confirm direct navigation to SPA routes resolves through Hosting rewrites
   - enter `/demo`, exercise local mutations, reload, reset, and exit
   - verify the demo makes no Firebase requests

6. Only after the invitation-aware Hosting build is verified, manually disable
   end-user account creation under **Authentication → Settings → User actions**.
   Re-test existing email/password and Google users, password reset, and a
   rejected new-user attempt. This Console change requires explicit
   authorization and is not performed by `firebase deploy`.

If a step fails, stop the release and diagnose it before proceeding. Never
weaken rules as a troubleshooting shortcut.

## Hosting and PWA boundaries

Firebase Hosting serves `dist` and rewrites unknown paths to `index.html` for
React Router. The app includes a manifest, favicon, app icon, title,
description, and theme metadata.

There is intentionally no service worker. The manifest improves installed
presentation, but Ludcount does not claim complete offline availability.
Firestore may expose cached reads, while authentication, first-time household
loading, and writes can still require a connection.
