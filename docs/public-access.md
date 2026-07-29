# Public Access, Invitations, Demo, and App Check

This document describes Ludcount's invitation-only access model and fully local
public demo. It is an operational guide, not authorization to change Firebase
Console settings or deploy.

## Invitation workflow

The application no longer exposes email/password registration. Existing
Firebase users can still sign in with their existing provider, and existing
email/password users can request a password reset.

The application maps `auth/admin-restricted-operation` to the localized
invitation-only message. A public access-request link can be supplied at build
time:

```text
VITE_ACCESS_REQUEST_URL=https://example.com/request-access
```

`mailto:` links are also accepted. The value is public configuration bundled
into the client; it must never contain a secret. If the variable is empty, the
UI shows a localized instruction to contact the person who shared Ludcount.

The Firestore rules intentionally continue to authorize the atomic personal
household bootstrap for any authenticated user. They cannot distinguish an
invited Firebase Authentication identity from another authenticated identity.
Invitation enforcement therefore depends on disabling self-service account
creation in Firebase Authentication, not on a client-side allowlist.

## Disable self-service account creation

After deploying and verifying the invitation-aware build, perform this manual
Firebase Console action:

1. Open **Authentication → Settings → User actions**.
2. Disable **end-user account creation**.
3. Leave account deletion disabled unless a separate deletion workflow has
   been reviewed.
4. Verify an existing email/password user and an existing Google user can still
   sign in.
5. Verify a new email/password registration attempt is rejected with
   `auth/admin-restricted-operation`.

Do not report this control as active until the Console setting has been
verified. Removing registration controls from the page is useful UX, but is
not backend enrollment control.

## Manually creating invited users

For an email/password invitation:

1. Open **Authentication → Users** in Firebase Console.
2. Select **Add user**.
3. Enter the invited address and a temporary password through an agreed secure
   channel.
4. Ask the user to sign in and use the password-reset flow to choose their own
   password.

The user's personal Firestore household is created atomically by the application
after their first successful sign-in. Do not create application collections or
documents manually.

## Google-provider enrollment limitation

For a first-time federated Google sign-in, Firebase Authentication can create
the Auth user as part of completing the provider flow before the application
receives the result. Ludcount checks the provider result's `isNewUser` marker,
best-effort deletes that new identity, falls back to signing it out, and never
exposes it to the household bootstrap path.

That cleanup is defense in depth, not secure enrollment authorization. It runs
in downloadable client code and can fail or be bypassed. Disabling end-user
account creation in Firebase Authentication is the authoritative control for
blocking unknown Google identities.

The Console's basic **Add user** flow creates email/password users; it is not a
general Google-provider invitation or credential-linking workflow. Until an
administrator-controlled Google enrollment design is implemented, invite new
users through email/password and treat Google sign-in as an existing-user path.

## Local demo guarantees

The public demo is entered explicitly at `/demo`; it is never inferred from a
missing user or Firebase failure.

- The demo route mounts neither `AuthProvider` nor `HouseholdProvider`.
- It does not initialize a Firebase Authentication listener.
- It uses `DemoTransactionRepository`, never
  `FirestoreTransactionRepository`.
- Its fixture is fictional and lives in application source, not a Firestore
  seed script.
- Create, edit, duplicate, delete, filters, note search, locale switching, and
  CSV export run locally.
- Mutations remain in browser memory. Reloading restores the original fixture,
  and **Reset demo** restores it explicitly.
- Entering and exercising the demo makes no Authentication, Firestore,
  Installations, or App Check request. Playwright verifies this boundary.

The demo does not claim durable or offline-capable storage. Its persistent
banner says that changes are not saved.

## App Check preparation and rollout

The production client can initialize Firebase App Check with reCAPTCHA
Enterprise when this public site key is present:

```text
VITE_FIREBASE_APP_CHECK_SITE_KEY=
```

An empty value leaves App Check uninitialized. A site key is public and is not
an administrator secret.

Use this rollout order:

1. Create and register a reCAPTCHA Enterprise site key for the exact production
   web origins after reviewing current service requirements and pricing. Do not
   enable billing without separate authorization.
2. Set `VITE_FIREBASE_APP_CHECK_SITE_KEY` in the reviewed production build.
3. Keep App Check enforcement **off**.
4. Deploy only with explicit release authorization, then verify Authentication,
   Firestore, and demo workflows and review App Check metrics.
5. After sufficient verified traffic, request explicit authorization before
   enabling enforcement for each supported Firebase product.
6. Monitor rejected requests and roll back enforcement if legitimate clients
   are blocked.

For local emulator and Playwright work, set:

```text
VITE_FIREBASE_APP_CHECK_DEBUG=true
```

The SDK then prints a generated debug token locally. Register that token in the
Firebase Console only when real protected services must be exercised. Keep the
token in a local or CI secret store; never put it in Git or a `VITE_*` variable.
The application rejects the boolean debug-provider switch in a production
build. Tests continue to use local Authentication and Firestore emulators
instead of weakening production settings.
