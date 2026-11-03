# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Ví Mình / My Wallet** is a personal income/expense tracker built with React Native + Expo (SDK 58), TypeScript and Expo Router. iOS ships first. Users sign in with email + password (Supabase Auth); data lives in a local JSON file per user and syncs to Supabase, so the app keeps working offline after the first sign-in. The product plan, in Vietnamese, is `vi-minh-my-wallet-plan.md` (see its 11/2026 update and section 8 acceptance criteria). Screen content is specified in `mockup UI/SCREENS.md`, which wins over the mockup images; visual style is in `mockup UI/DESIGN.md`.

`AGENTS.md` holds Expo's own guidance. Most importantly: Expo APIs change every SDK, so check the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`) before using an Expo API instead of relying on memory, and always add packages with `npx expo install`.

## Commands

```
npx expo start                     # dev server (Expo Go / dev build); also regenerates typed routes
npm run typecheck                  # tsc --noEmit
npm run lint                       # expo lint
npm test                           # jest, all tests
npx jest src/domain/__tests__/budgets.test.ts          # single file
npx jest src/domain/__tests__/budgets.test.ts -t "warns"  # single test
npx expo export --platform ios --output-dir <dir>      # bundle check without a device
npx expo-doctor                    # dependency/config health
```

Supabase setup (migrations, Edge Function, redirect URLs, SMTP, email templates, dev build) is a checklist in `supabase/SETUP.md`.

Tests: domain/state tests are plain Jest. Component tests live in `src/__tests__/ui/` (never under `src/app/`, which Expo Router would treat as routes) and use `@testing-library/react-native` v14, where `render` and `fireEvent` are async (`await`). `jest.setup.ts` mocks AsyncStorage, safe-area, Ionicons and the Supabase client; tests mock `expo-router` and `@/state/session` themselves.

Run typecheck, lint and tests before calling a task done. Native iOS builds need macOS + Xcode or EAS (`npx eas-cli@latest build`); the dev machine is Windows. After adding a route file, typed routes (`.expo/types/router.d.ts`) are stale until `npx expo start` runs once.

TypeScript 6 doesn't auto-include `@types/*`, so global types are listed in `tsconfig.json` `compilerOptions.types`. `@/*` maps to `src/*`. Supabase settings come from `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`); the schema is in `supabase/migrations/` (`v2_sync` set up the sync tables; later migrations add `recurring` and `debts`).

## Architecture

Layers, with dependencies pointing down only:

- `src/app/`: Expo Router routes only. `_layout.tsx` boots settings, app lock, auth and the session, and guards routes with `Stack.Protected` (`(auth)/` when signed out; everything else when signed in). It overlays a spinner while data loads, the lock screen, or a recovery screen if the data file can't be read. `(tabs)/` holds Overview, Ledger, a placeholder `add` tab (its button opens the modal), Budget and Settings. Modals/pages: `transaction.tsx` (add/edit, `?id=`; modes Expense / Income / Debt, `?mode=debt&direction=` opens Debt; a debt saves to the debt book), `report.tsx`, `wallets.tsx`, `wallet-edit.tsx` (`?id=`), `pin.tsx`, `profile.tsx` (display name in Supabase `user_metadata.full_name`, password change and account deletion after re-checking the password), `categories.tsx` + `category-edit.tsx` (`?id=` / `?type=`), `recurring.tsx` + `recurring-edit.tsx` (`?id=`), `debts.tsx` (`?direction=`) + `debt-edit.tsx` (`?id=` / `?direction=`). `report.tsx` has week and month modes. Outside the guards (reachable signed in or out): `auth-callback.tsx` (email-link landing) and `legal.tsx` (`?doc=terms|privacy`).
- `src/components/`: shared UI (`motion.tsx` animation kit on RN `Animated` — `PressScale`, `FadeIn`, `Pop`, `useCountUp`, all off under Reduce Motion; `Screen` staggers its sections in, `SegmentedControl` slides its thumb, `ProgressBar` grows, `Sheet` springs up; `ui.tsx` primitives, `wallet.tsx` domain-aware pieces, `AppHeader`, `AuthLayout`, `PinPad`, `LockScreen`), `useBackupActions` and `useSignOut`.
- `src/state/`: Zustand stores. `walletStore.ts` is a factory; `open(repository)` switches users. `wallet.ts` builds the app instance and hooks. `session.ts` ties the signed-in user to their repository, outbox and sync engine. `auth.ts`, `appLock.ts`, `settings.ts`, `ui.ts` (selected month). Selectors must return stable references (Zustand v5 loops otherwise), so use `useTransactions()`/`useBudgets()`/`useWallets()` rather than `s.data?.x ?? []`.
- `src/services/syncEngine.ts`: push/pull logic over a `RemoteApi`, `Outbox` and cursor; no Supabase import, so it's tested with fakes.
- `src/domain/`: pure TypeScript business rules (money, dates, transactions, wallets, budgets, reports, number words, sync diff/merge, auth form validation, data schema/validation/migrations). No React or Expo imports, so it's tested directly with Jest.
- `src/data/`: persistence and I/O. `WalletRepository` interface, `JsonFileRepository` (one file per user), `MemoryRepository` (tests), `outbox.ts` (file/memory outbox), `syncRows.ts` (record ↔ row mapping), `supabaseClient.ts`, `supabaseRemote.ts`, `backupFile.ts`, `settingsStorage.ts`.

Rules that span files:

- UI never touches files or Supabase. All wallet data goes through the store, then the repository.
- Store mutations are queued and run one at a time: compute next state, `repository.save`, and only then publish. A failed save leaves state unchanged and reports nothing to sync. After a successful save the store calls `onCommitted` with the record-level diff (`diffWalletData`), which `session.ts` appends to the user's outbox.
- Sync: the local file is the source of truth. An incremental sync pulls first, then pushes: `pull` reads rows with `server_updated_at` after the cursor (server time only, with a 60s overlap); a pending local op on a record whose server copy has a newer `updatedAt` is dropped (last write wins; records without `updatedAt` and remote deletions keep the local op); the rest is applied except for records that still have pending ops; then `flush` pushes the outbox in order. `applyRemoteChangesSafely` skips server rows that would make the data invalid (leave-one-out, then one at a time) instead of failing the whole sync. The first sync on a device pushes only records the server lacks, so fresh defaults never overwrite existing account data. Deletes are soft (`deleted_at`).
- `JsonFileRepository` writes `<file>.tmp` first, deletes the main file, then renames. `load()` recovers from the temp file and returns `null` when nothing is stored (the store then creates initial data). If the stored file is invalid, it throws `StorageError` and never overwrites it. The user recovers by restoring a backup (`replaceAll` works even when loading failed). The pre-account `wallet.json` is offered for import once per device.
- `WalletData.version` plus `MIGRATIONS` in `domain/walletData.ts` handle schema upgrades. Bump `CURRENT_VERSION` and add a migration whenever the persisted shape changes (v2 added wallets, v3 recurring rules, v4 debts). `parseWalletData` validates everything (amounts, dates, times, wallet/category references and types, transfers, one default wallet, duplicate ids) before data is accepted, from disk, from a backup or from the server.
- Backups are the wallet data plus `app: 'my-wallet'` and `exportedAt`. Import validates the file fully, then asks for confirmation, then replaces the data (which also syncs).

Email links: `signUp`/`resetPasswordForEmail` pass `authRedirectUrl()` (`mywallet://auth-callback?flow=confirm|recovery`, or the `exp://…/--/auth-callback` form in Expo Go). `state/auth.ts` listens to `expo-linking`, parses the URL with `domain/authLink.ts` (query + fragment; the router drops fragments), sets the session, and for `recovery` sets `recovering`, which makes the root layout show `NewPasswordScreen`. Supabase → Authentication → URL Configuration must list `mywallet://**` (and `exp://**` for Expo Go) under Redirect URLs.

Account deletion: `session.deleteAccount(password)` re-checks the password, calls the `delete-account` Edge Function (`supabase/functions/`, Deno, excluded from tsc/eslint; deploy with `npx supabase functions deploy delete-account`), which deletes the auth user so every table's `on delete cascade` removes the data; then it signs out and deletes the user's files, sync cursor and PIN.

## Business rules

- Recurring rules (`domain/recurring.ts`) are income/expense, weekly or monthly from `startDate` (monthly keeps the day, clamped to short months). `generateDueTransactions` creates occurrences up to today as normal transactions with id `<ruleId>@<date>` (so two devices never duplicate one), advances `nextDate`, and pauses a rule whose wallet/category became unusable. The session runs it after opening the user's data and on every return to the foreground; wallets and categories used by a rule can't be deleted.
- App lock: the PIN is stored as `v1:<salt>:<sha256(salt:pin)>` in SecureStore (plain PINs from older builds are upgraded on load). After 5 wrong PINs each attempt waits 30 s, doubling up to 15 min; the 10th wrong PIN removes the lock and signs out. The counter lives in SecureStore so restarts don't reset it (`domain/pinLock.ts`).
- Daily reminder: local notifications only (`services/reminders.ts`, `expo-notifications` with `enableRemoteNotifications: false`). One dated notification per day for the next 30 days (`domain/reminders.ts`; iOS allows 64 pending), skipping today once the user has logged something today (by `createdAt`, recurring occurrences excluded). `useReminderSchedule` reschedules on setting/time/language changes, new transactions and every return to the foreground. Reminders play the default sound and set the app icon badge to 1 (cleared once something is logged today or reminders are off); the optional `reminderProminent` setting makes them Time Sensitive (entitlement `com.apple.developer.usernotifications.time-sensitive` in app.json). Tapping a reminder opens `/transaction` via `useNotificationObserver` (only that route is accepted, and only once signed in with data loaded).

- Debts (`domain/debts.ts`) are `lent` (someone owes the user) or `borrowed`, with a person, amount, wallet and date. They move wallet money (lending takes it out of `walletId`, borrowing adds it) and are settled in full once (`settledDate` + `settleWalletId`, which reverses the effect on that wallet); they can be reopened. Like transfers, they never count toward income/expense, budgets or reports, and they don't appear in the ledger. Wallets used by a debt count as in use. The Overview shows open totals when any exist.
- Money is a positive integer of đồng (VND only, `MAX_AMOUNT` cap). Never use floats. Opening balances may be 0.
- Transactions are `income`, `expense` or `transfer`. The UI no longer creates transfers (the user only wants manual notes); existing transfers still load, show, edit and delete. Every transaction has a `walletId`; transfers also have `toWalletId` and no category. Transfers never count toward income/expense totals, budgets or reports.
- Wallet balance = opening balance + income − expense − transfers out + transfers in. Total balance sums active (non-archived) wallets. Exactly one active wallet is the default. Wallets with transactions can only be archived, not deleted; the last active wallet can't be removed.
- `transactionDate` is a `YYYY-MM-DD` calendar string and `transactionTime` an optional `HH:mm`, both device local time. Months group by string prefix, so timezone changes never move transactions. Weeks run Monday–Sunday.
- Budgets are a monthly limit per expense category, applied to every month. Status is `warning` at ≥ 80% and `over` when spending is above the limit (exactly 100% shows as "limit reached").
- Built-in categories live in `domain/categories.ts` with a `builtInKey` translated via `category.<key>` and are read-only. User categories have a `name`, a type fixed at creation, and can be deleted only while unused (their budget goes with them). Name uniqueness is checked per type against translated names passed in by the UI.

## i18n and theming

- Strings live in `src/i18n/vi.ts` (source of keys) and `en.ts` (typed against it). Use `useT()` for `t`, `language`, `categoryName` and formatters (`money`, `signedMoney`, `dayMonth`, `month`, `relativeDate`, `weekday`). Language preference is system / vi / en; the system setting resolves to vi on Vietnamese devices and English otherwise.
- Brand palette: navy `#1C4D86` is `primary`/`hero`; income is green `#009753` (`colors.income`), expense pink `#EE64A4` (`colors.expense`), debt purple `#7C5CC4` (`colors.debt`); danger/over-budget stays red. Each has a `*Soft` tint; use them consistently for amounts, icons and segments. Colors come from `useTheme()` (light/dark tokens in `src/theme`). Don't hard-code colors or user-visible strings in screens; category/wallet colors are data and get tinted with `tint()`.
- Brand: `components/brand.tsx` draws the logo with Views (`BrandMark`, colors from the `logo*` theme tokens) and the `Wordmark` (sắc/huyền tone marks in the coin pink, by overlaying the bare letter). Use them instead of a generic wallet icon. The typeface is Be Vietnam Pro, embedded by the `expo-font` plugin from `assets/fonts/` (needs a native rebuild; Expo Go and web fall back to the system font); text gets it through `fontFamily` from `@/theme`, already applied in `AppText`, `ui.tsx` and every `TextInput`, so new raw `Text`/`TextInput` styles must add it too. App icons (iOS light/dark/tinted, Android adaptive) and splash images are rendered from the same 120-unit mark geometry.

## Not built yet

Apple/Google sign-in, changing email, editing or hiding built-in categories, archiving used categories, multi-currency, recurring transfers (rules are income/expense only), partial debt repayments, debt due dates and reminders, debt events in the ledger.
