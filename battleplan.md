# Ludcount — Battle Plan

> A tiny household money tracker for people who want to record income and expenses, not cosplay as an accountant.

## Nerdy TL;DR

```text
Input money event -> validate -> store integer minor units in Firestore
                  -> update derived UI totals client-side
                  -> sync across devices
                  -> export boring, portable CSV
```

- **Product:** simple household income/expense tracker.
- **Default UI language:** Czech (`cs`).
- **Optional UI language:** English (`en`), switchable in Settings.
- **Code, identifiers, commits, documentation, and Codex conversation:** English.
- **Frontend:** React + TypeScript + Vite.
- **Backend:** Firebase Authentication + Cloud Firestore.
- **Hosting:** Firebase Hosting or GitHub Pages only if Firebase configuration permits it cleanly.
- **Money storage:** integers in minor currency units; never floating-point arithmetic.
- **Default currency:** CZK, but keep currency configurable per household.
- **Primary device:** mobile phone; desktop remains fully usable.
- **Core constraint:** recording a normal expense should take under ten seconds.
- **MVP doctrine:** no bank connection, OCR, invoices, tax accounting, AI adviser, or decorative enterprise sludge.

---

## 1. Product goal

Ludcount helps an individual or household answer four questions:

1. How much money came in this month?
2. How much went out?
3. What was it spent on?
4. What remains?

The app is a **household money journal**, not formal accounting software. Czech copy should therefore use ordinary language such as **Příjem**, **Výdaj**, **Kategorie**, and **Zbývá**, rather than accounting jargon.

### Success criteria

A first-time user can:

1. open the app,
2. sign in,
3. add an expense,
4. understand the monthly summary,
5. find and edit the entry,
6. export their data,

without reading a manual.

---

## 2. Non-goals

Do not implement these in the MVP:

- bank API integration,
- receipt scanning or OCR,
- invoice creation,
- tax or VAT calculations,
- double-entry bookkeeping,
- investment tracking,
- automatic exchange-rate conversion,
- financial advice,
- complex analytics,
- attachment storage,
- offline conflict-resolution machinery beyond Firestore's normal client behavior,
- custom backend servers,
- admin dashboards,
- blockchain, naturally.

Features outside the MVP must not leak into the data model or UI unless they are nearly free to support.

---

## 3. Language policy

### User interface

- Default locale: `cs`.
- Secondary locale: `en`.
- Language can be changed in **Nastavení / Settings**.
- Store the chosen locale in the user's preferences.
- Before authentication, use saved local preference; otherwise default to Czech.
- All visible strings must come from translation files. Do not hard-code Czech or English text inside components.
- Dates and numbers must use `Intl.DateTimeFormat` and `Intl.NumberFormat`.

Suggested structure:

```text
src/i18n/
  cs.ts
  en.ts
  index.ts
```

### Development language

Use English for:

- source code,
- variable and function names,
- component names,
- comments,
- tests,
- Git commits,
- pull requests,
- technical documentation,
- communication and prompts exchanged with Codex.

Czech belongs in translation resources, fixtures that explicitly test Czech behavior, and end-user content.

---

## 4. MVP feature set

### 4.1 Authentication

Support:

- Google sign-in,
- email and password sign-in,
- sign-out,
- password reset.

A user must only access households of which they are a member.

Do not add anonymous accounts in the MVP. Anonymous-to-permanent-account migration is avoidable complexity and an excellent source of orphaned data.

### 4.2 Household

On first sign-in:

- create a personal household automatically,
- use a sensible localized name such as **Moje domácnost**,
- set currency to `CZK`,
- make the user the household owner.

MVP may support only one active household per user in the UI. The schema should still allow multiple household memberships later.

Sharing/invitations are **post-MVP** unless the basic app is already complete and stable.

### 4.3 Transactions

Each transaction contains:

- type: income or expense,
- amount,
- category,
- date,
- optional note,
- creator,
- creation and update timestamps.

Required actions:

- create,
- edit,
- delete with confirmation,
- duplicate,
- list newest first,
- filter by month,
- filter by category,
- filter by type,
- search notes.

#### Fast-entry behavior

- The amount field receives focus when the form opens.
- Date defaults to today.
- Expense is the default transaction type.
- Recently used categories appear first without mutating the canonical category order.
- Submit from the keyboard where appropriate.
- Keep the form short; advanced options must not block the main path.
- Preserve entered values when validation fails.
- After save, show brief feedback and return to a useful screen.

### 4.4 Categories

Ship localized default categories.

#### Expense defaults

- Groceries / Potraviny
- Housing / Bydlení
- Utilities / Energie
- Transport / Doprava
- Health / Zdraví
- Drugstore / Drogerie
- Clothing / Oblečení
- Restaurants / Restaurace
- Entertainment / Zábava
- Gifts / Dárky
- Other / Ostatní

#### Income defaults

- Salary / Výplata
- Pension / Důchod
- Benefits / Podpora
- Sale / Prodej
- Refund / Vrácené peníze
- Other / Ostatní

Users can:

- create custom categories,
- rename custom categories,
- archive categories,
- reorder categories.

Built-in categories should use stable language-independent keys such as `expense.groceries`. Their labels come from i18n files. Custom category names are stored as entered and are not translated.

A category already used by a transaction must be archived rather than physically deleted.

### 4.5 Dashboard

Show the selected month's:

- total income,
- total expenses,
- balance (`income - expenses`),
- latest transactions,
- expense totals grouped by category.

The dashboard must remain useful without charts. Start with numbers and lists. A simple accessible bar visualization may be added later; pie charts are not mandatory and frequently become colorful clocks nobody can read.

### 4.6 Transaction history

Provide:

- month navigation,
- grouped or clearly dated transaction list,
- filters,
- note search,
- edit action,
- duplicate action,
- delete action.

Empty states must explain what to do next and offer the add-transaction action.

### 4.7 CSV export

Export:

- selected month,
- all transactions.

Use UTF-8 with a BOM so Czech diacritics open correctly in common spreadsheet software.

Recommended columns:

```text
Date,Type,Amount,Currency,Category,Note,Created by,Created at,Updated at
```

The exported amount should be a localized human-readable decimal value, while internal storage remains integer minor units.

No CSV import in the MVP.

### 4.8 Settings

Include:

- language: Czech / English,
- household name,
- currency,
- category management,
- CSV export,
- account/sign-out controls,
- app version/build identifier.

Changing household currency does not convert historical amounts. Display a clear warning before applying the change.

---

## 5. Navigation and screens

### Mobile navigation

Use three primary destinations:

1. **Overview / Přehled**
2. **Transactions / Záznamy**
3. **Settings / Nastavení**

Use a persistent, prominent add button. It may be a floating action button or a clearly dominant button in the navigation layout.

### Required screens

```text
/sign-in
/app/overview
/app/transactions
/app/transactions/new
/app/transactions/:id/edit
/app/settings
/app/settings/categories
```

Modal or drawer presentation is acceptable for transaction entry, but the state must remain navigable and testable. Avoid an application made entirely of mystery modals.

---

## 6. Recommended technical stack

Use current stable versions at implementation time and verify compatibility before installing.

### Core

- React
- TypeScript with strict mode
- Vite
- React Router
- Firebase modular Web SDK
- Cloud Firestore
- Firebase Authentication

### Supporting libraries

Prefer a small dependency set. Reasonable choices:

- `react-hook-form` for forms,
- `zod` for runtime validation,
- `date-fns` only if native date handling becomes unwieldy,
- `vitest` + Testing Library for tests,
- Playwright for a minimal end-to-end smoke suite,
- ESLint + Prettier.

Do not add a global state library until normal React state, context, and focused hooks demonstrably fail. Firestore is not improved by wrapping it in seventeen layers of fashionable plumbing.

### Styling

Choose one restrained method and keep it consistent:

- CSS Modules, or
- plain organized CSS with design tokens.

Avoid adopting a heavy component framework merely to obtain buttons and cards.

---

## 7. Money rules

This section is non-negotiable.

- Store amounts as integer minor units.
- For CZK, `12550` means `125.50 CZK` even though normal Czech cash usage often has no visible haléře.
- Never store or calculate currency values with JavaScript floating-point numbers representing major units.
- Convert user input to minor units at the form boundary.
- Format minor units for display at the UI boundary.
- Reject zero and negative transaction amounts; direction is represented by transaction type.
- Set a documented maximum amount to prevent absurd input and accidental integer abuse.
- All aggregation helpers must be unit-tested.

Suggested type:

```ts
export type MoneyAmount = number & { readonly __brand: "MoneyAmountMinorUnits" };
```

A plain integer is acceptable at Firestore boundaries, but application helpers should make unit mistakes difficult.

---

## 8. Dates and time

Transactions represent a user-selected **calendar date**, not a precise moment.

Store:

- `dateKey`: local date string in `YYYY-MM-DD`,
- `createdAt`: Firestore server timestamp,
- `updatedAt`: Firestore server timestamp.

Use `dateKey` for month filtering and grouping. Do not derive transaction day from a UTC timestamp; that is how yesterday's groceries teleport into tomorrow.

For queries, also store:

- `monthKey`: `YYYY-MM`.

This small duplication makes Firestore queries simple and explicit.

---

## 9. Firestore data model

Proposed structure:

```text
users/{userId}
  displayName
  email
  locale
  activeHouseholdId
  createdAt
  updatedAt

households/{householdId}
  name
  currency
  ownerId
  createdAt
  updatedAt

households/{householdId}/members/{userId}
  role: "owner" | "member"
  displayName
  joinedAt

households/{householdId}/transactions/{transactionId}
  type: "income" | "expense"
  amountMinor
  currency
  categoryId
  categoryLabelSnapshot
  dateKey
  monthKey
  note
  createdBy
  createdAt
  updatedAt

households/{householdId}/categories/{categoryId}
  kind: "system" | "custom"
  systemKey
  customName
  transactionType: "income" | "expense"
  icon
  sortOrder
  archived
  createdAt
  updatedAt
```

### Why snapshot the category label?

`categoryLabelSnapshot` preserves useful export/history context if a custom category is later renamed. The live UI may show the current category name while exports can choose a clearly documented policy. Keep the behavior consistent.

### Currency per transaction

Store the household currency on each transaction. This prevents a later household currency setting change from silently relabeling historical money.

---

## 10. Firestore security rules

Security rules are part of the application, not deployment confetti.

Rules must ensure:

- authentication is required,
- users can read and update only their own user document,
- only household members can read household data,
- only household members can create transactions,
- a transaction's `createdBy` must match the authenticated user on create,
- immutable ownership fields cannot be rewritten casually,
- only owners can change household-level settings,
- only owners can manage membership,
- validated fields have expected types and allowed values,
- amount is an integer within the documented range,
- `dateKey` and `monthKey` use valid constrained formats.

Add emulator-based tests for allow and deny cases before production deployment.

Never rely on hidden buttons for authorization. Attackers also own browsers. Very inconsiderate of them.

---

## 11. Firebase configuration

Use environment variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Provide:

- `.env.example` with placeholders,
- `.env.local` ignored by Git,
- clear setup instructions in `README.md`.

Firebase web configuration is not a secret, but service-account credentials absolutely are. No service-account JSON belongs in the browser app or repository.

Set authorized authentication domains deliberately for local development and production.

---

## 12. Derived data and performance

For MVP scale, calculate monthly totals client-side from the selected month's queried transactions.

Do not introduce Cloud Functions or denormalized aggregate documents initially.

Reconsider only when real usage shows a problem. A household expense tracker is unlikely to melt Firestore because someone bought too many rohlíky.

Recommended query pattern:

```text
householdId + monthKey, ordered by dateKey descending and createdAt descending
```

Create required Firestore indexes and commit the index configuration.

---

## 13. Validation and error handling

### Transaction validation

- type is income or expense,
- amount is required and greater than zero,
- amount parses deterministically,
- category belongs to the transaction type,
- date is valid,
- note has a reasonable maximum length,
- archived categories cannot be selected for new transactions,
- currency matches the active household setting at creation time.

### UX behavior

- Display validation next to the relevant field.
- Use localized error messages.
- Preserve form input after failed writes.
- Disable duplicate submissions while saving.
- Distinguish offline, permission, authentication, and generic errors where practical.
- Log technical detail in development; show human language in production.

---

## 14. Accessibility

Minimum requirements:

- keyboard-accessible controls,
- visible focus indicators,
- semantic form labels,
- sufficient contrast,
- no meaning communicated by color alone,
- accessible confirmation dialogs,
- screen-reader text for icon-only controls,
- touch targets suitable for phones,
- respect reduced-motion preferences.

Test at least one complete flow using only a keyboard.

---

## 15. Responsive design

Design mobile-first.

### Small screens

- single-column layout,
- sticky or easily reachable add action,
- transaction rows with the amount visually dominant,
- filters in a compact drawer or expandable region,
- avoid horizontal scrolling.

### Desktop

- constrained readable content width,
- dashboard may use columns,
- transaction filters may stay visible,
- do not stretch forms across the entire monitor like a tax return projected onto a cinema screen.

---

## 16. Testing strategy

### Unit tests

Cover:

- money parsing and formatting,
- integer aggregation,
- income/expense balance calculation,
- date and month key creation,
- CSV escaping and generation,
- translation key parity,
- transaction schema validation.

### Component tests

Cover:

- add transaction form,
- validation behavior,
- dashboard totals,
- transaction filtering,
- language switching,
- category archiving behavior.

### Firestore rules tests

Using Firebase Emulator Suite, verify:

- unauthenticated access denied,
- non-member access denied,
- member read/write allowed where expected,
- invalid amount rejected,
- forged creator rejected,
- member cannot perform owner-only changes.

### End-to-end smoke tests

At minimum:

1. sign in using emulator/test mode,
2. create an expense,
3. observe dashboard update,
4. edit the expense,
5. filter transaction history,
6. switch Czech to English,
7. export CSV,
8. delete the transaction.

---

## 17. Suggested project structure

```text
/
  battleplan.md
  README.md
  firebase.json
  firestore.rules
  firestore.indexes.json
  .env.example
  src/
    app/
      App.tsx
      router.tsx
      providers.tsx
    components/
    features/
      auth/
      dashboard/
      transactions/
      categories/
      settings/
      export/
    firebase/
      app.ts
      auth.ts
      firestore.ts
      converters.ts
    i18n/
      cs.ts
      en.ts
      index.ts
    lib/
      money.ts
      dates.ts
      csv.ts
      errors.ts
    styles/
    test/
    main.tsx
```

Organize by feature rather than creating giant global folders full of unrelated hooks and types.

---

## 18. Delivery phases

### Phase 0 — Scaffold

Deliver:

- Vite React TypeScript project,
- strict TypeScript,
- linting and formatting,
- unit-test setup,
- basic routing,
- Czech/English i18n skeleton,
- responsive application shell,
- `.env.example`,
- initial README.

Exit condition: app builds, tests run, language switch demonstrates Czech default and English alternative.

### Phase 1 — Local vertical slice

Implement without Firebase persistence first if helpful:

- transaction form,
- transaction list,
- dashboard totals,
- default categories,
- money/date helpers,
- in-memory repository abstraction.

Exit condition: a transaction can be added, edited, and deleted; totals remain correct; UI works on phone and desktop widths.

### Phase 2 — Firebase integration

Implement:

- Firebase initialization,
- authentication,
- automatic personal household creation,
- Firestore repositories,
- converters and validation,
- loading/error states,
- emulator support.

Exit condition: signed-in users can persist and retrieve their own data after reload.

### Phase 3 — Security and categories

Implement:

- Firestore rules,
- rules tests,
- category management,
- archived-category handling,
- correct membership checks.

Exit condition: cross-user access is denied by tested rules, not merely by optimism.

### Phase 4 — Search, filters, and export

Implement:

- month navigation,
- type/category filters,
- note search,
- duplicate transaction,
- CSV export with Czech-safe encoding.

Exit condition: user can locate and export useful data.

### Phase 5 — Polish and deploy

Complete:

- accessibility pass,
- responsive pass,
- empty states,
- production error handling,
- Firebase indexes,
- deployment documentation,
- basic end-to-end smoke tests,
- production build and hosting configuration.

Exit condition: an ordinary non-technical Czech user can use the deployed app without developer intervention.

---

## 19. Post-MVP candidates

Only consider these after real use:

- household invitations and multiple members,
- recurring transaction suggestions,
- monthly category budgets,
- multiple accounts or wallets,
- CSV import,
- installable PWA support,
- offline status indicator,
- optional simple charts,
- multiple households,
- data backup package.

Prioritize based on user friction, not feature-list vanity.

---

## 20. Codex operating instructions

Codex should follow this workflow for every meaningful implementation step.

### Before coding

1. Read `battleplan.md` and relevant existing files.
2. Inspect the current repository state; do not assume the scaffold or library choices.
3. State the intended change in a brief English plan.
4. Identify affected data contracts, security rules, translations, and tests.
5. Prefer the smallest coherent vertical slice.

### While coding

- Keep all technical communication in English.
- Preserve Czech as the default UI locale.
- Add both Czech and English strings for every new user-visible message.
- Keep translation key sets synchronized.
- Use integer minor units for money.
- Avoid `any`; explain rare exceptions.
- Keep Firebase access behind focused repository/service functions rather than scattering SDK calls across components.
- Do not add dependencies without a concrete reason.
- Do not silently broaden scope.
- Do not replace working architecture merely because another library is fashionable this week.

### Before declaring completion

Run, at minimum:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If scripts differ, inspect `package.json` and run their real equivalents.

Then:

1. test the changed flow manually or with an automated browser test,
2. verify both Czech and English UI,
3. verify mobile and desktop widths,
4. report files changed,
5. report commands run and their results,
6. state remaining limitations honestly.

### Commit discipline

Use focused English commit messages, for example:

```text
feat: add transaction entry flow
feat: persist household transactions in Firestore
fix: preserve local transaction date across time zones
test: cover Firestore household access rules
docs: document Firebase emulator setup
```

Do not combine unrelated refactors with feature work.

---

## 21. Definition of done for the MVP

The MVP is done when all of the following are true:

- Czech is the default UI language.
- English can be selected in Settings and persists.
- A user can register, sign in, reset a password, and sign out.
- First sign-in creates a usable personal household.
- Income and expense transactions can be created, edited, duplicated, and deleted.
- Monthly totals and balance are correct.
- Categories work in both languages.
- Custom categories can be created and archived safely.
- Transaction history supports month/category/type filtering and note search.
- CSV export opens with correct Czech characters.
- Firestore rules prevent access by non-members.
- Critical money, date, CSV, and security behavior is tested.
- The interface is usable on a normal phone and desktop browser.
- Production configuration and deployment are documented.
- No secrets are committed.
- Lint, types, tests, and production build pass.

---

## 22. First Codex prompt

Use this after cloning the repository:

```text
Read battleplan.md completely and treat it as the product and engineering contract.

Scaffold Phase 0 of Ludcount as a React + TypeScript + Vite application. Keep all code, documentation, comments, commit messages, and communication in English. The user interface must default to Czech and allow switching to English in Settings, with the preference persisted locally for now.

Implement only the Phase 0 scope: strict TypeScript, routing, a responsive app shell, Czech/English translation infrastructure, a visible language setting, ESLint, formatting, Vitest setup, .env.example, and a practical README. Do not connect Firebase yet, but create clean seams for later Firebase initialization. Avoid heavy UI frameworks and unnecessary dependencies.

Before editing, inspect the repository and present a brief plan. After editing, run lint, typecheck, tests, and the production build. Fix all failures. Then summarize changed files, commands run, results, and remaining Phase 1 work.
```

Build the boring core first. Boring financial software that keeps correct totals is considerably more exciting than clever financial software that loses them.
