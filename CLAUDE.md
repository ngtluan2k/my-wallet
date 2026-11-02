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

Run typecheck, lint and tests before calling a task done. Native iOS builds need macOS + Xcode or EAS (`npx eas-cli@latest build`); the dev machine is Windows. After adding a route file, typed routes (`.expo/types/router.d.ts`) are stale until `npx expo start` runs once.

TypeScript 6 doesn't auto-include `@types/*`, so global types are listed in `tsconfig.json` `compilerOptions.types`. `@/*` maps to `src/*`. Supabase settings come from `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`); the schema is in `supabase/migrations/` (the `v2_sync` migration is the current one).

## Architecture

Layers, with dependencies pointing down only:

- `src/app/`: Expo Router routes only. `_layout.tsx` boots settings, app lock, auth and the session, and guards routes with `Stack.Protected` (`(auth)/` when signed out; everything else when signed in). It overlays a spinner while data loads, the lock screen, or a recovery screen if the data file can't be read. `(tabs)/` holds Overview, Ledger, a placeholder `add` tab (its button opens the modal), Budget and Settings. Modals/pages: `transaction.tsx` (add/edit, `?id=`), `report.tsx`, `wallets.tsx`, `wallet-edit.tsx` (`?id=`), `pin.tsx`.
- `src/components/`: shared UI (`ui.tsx` primitives, `wallet.tsx` domain-aware pieces, `AppHeader`, `AuthLayout`, `PinPad`, `LockScreen`) and `useBackupActions`.
- `src/state/`: Zustand stores. `walletStore.ts` is a factory; `open(repository)` switches users. `wallet.ts` builds the app instance and hooks. `session.ts` ties the signed-in user to their repository, outbox and sync engine. `auth.ts`, `appLock.ts`, `settings.ts`, `ui.ts` (selected month). Selectors must return stable references (Zustand v5 loops otherwise), so use `useTransactions()`/`useBudgets()`/`useWallets()` rather than `s.data?.x ?? []`.
- `src/services/syncEngine.ts`: push/pull logic over a `RemoteApi`, `Outbox` and cursor; no Supabase import, so it's tested with fakes.
- `src/domain/`: pure TypeScript business rules (money, dates, transactions, wallets, budgets, reports, number words, sync diff/merge, auth form validation, data schema/validation/migrations). No React or Expo imports, so it's tested directly with Jest.
- `src/data/`: persistence and I/O. `WalletRepository` interface, `JsonFileRepository` (one file per user), `MemoryRepository` (tests), `outbox.ts` (file/memory outbox), `syncRows.ts` (record ↔ row mapping), `supabaseClient.ts`, `supabaseRemote.ts`, `backupFile.ts`, `settingsStorage.ts`.

Rules that span files:

- UI never touches files or Supabase. All wallet data goes through the store, then the repository.
- Store mutations are queued and run one at a time: compute next state, `repository.save`, and only then publish. A failed save leaves state unchanged and reports nothing to sync. After a successful save the store calls `onCommitted` with the record-level diff (`diffWalletData`), which `session.ts` appends to the user's outbox.
- Sync: the local file is the source of truth. `flush` pushes outbox ops in order; `pull` reads rows with `server_updated_at` after the cursor (server time only, with a 60s overlap) and applies them except for records that still have pending local ops. The first sync on a device pushes only records the server lacks, so fresh defaults never overwrite existing account data. Deletes are soft (`deleted_at`).
- `JsonFileRepository` writes `<file>.tmp` first, deletes the main file, then renames. `load()` recovers from the temp file and returns `null` when nothing is stored (the store then creates initial data). If the stored file is invalid, it throws `StorageError` and never overwrites it. The user recovers by restoring a backup (`replaceAll` works even when loading failed). The pre-account `wallet.json` is offered for import once per device.
- `WalletData.version` plus `MIGRATIONS` in `domain/walletData.ts` handle schema upgrades. Bump `CURRENT_VERSION` and add a migration whenever the persisted shape changes (v2 added wallets). `parseWalletData` validates everything (amounts, dates, times, wallet/category references and types, transfers, one default wallet, duplicate ids) before data is accepted, from disk, from a backup or from the server.
- Backups are the wallet data plus `app: 'my-wallet'` and `exportedAt`. Import validates the file fully, then asks for confirmation, then replaces the data (which also syncs).

## Business rules

- Money is a positive integer of đồng (VND only, `MAX_AMOUNT` cap). Never use floats. Opening balances may be 0.
- Transactions are `income`, `expense` or `transfer`. Every transaction has a `walletId`; transfers also have `toWalletId` and no category. Transfers never count toward income/expense totals, budgets or reports.
- Wallet balance = opening balance + income − expense − transfers out + transfers in. Total balance sums active (non-archived) wallets. Exactly one active wallet is the default. Wallets with transactions can only be archived, not deleted; the last active wallet can't be removed.
- `transactionDate` is a `YYYY-MM-DD` calendar string and `transactionTime` an optional `HH:mm`, both device local time. Months group by string prefix, so timezone changes never move transactions. Weeks run Monday–Sunday.
- Budgets are a monthly limit per expense category, applied to every month. Status is `warning` at ≥ 80% and `over` when spending is above the limit (exactly 100% shows as "limit reached").
- Built-in categories live in `domain/categories.ts` with a `builtInKey` translated via `category.<key>`. User categories would use `name`.

## i18n and theming

- Strings live in `src/i18n/vi.ts` (source of keys) and `en.ts` (typed against it). Use `useT()` for `t`, `language`, `categoryName` and formatters (`money`, `signedMoney`, `dayMonth`, `month`, `relativeDate`, `weekday`). Language preference is system / vi / en; the system setting resolves to vi on Vietnamese devices and English otherwise.
- Colors come from `useTheme()` (light/dark tokens in `src/theme`). Don't hard-code colors or user-visible strings in screens; category/wallet colors are data and get tinted with `tint()`.

## Not built yet

Apple/Google sign-in, account management (change email/password, delete account), custom category management UI, unarchiving wallets, multi-currency, and UI/component tests (`@testing-library/react-native` is installed but unused).
