# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Ví Mình / My Wallet** is an offline-first personal income/expense tracker built with React Native + Expo (SDK 58), TypeScript and Expo Router. iOS ships first. There's no backend and no login. The product plan, in Vietnamese, is `vi-minh-my-wallet-plan.md`; its MVP acceptance criteria (section 8) are the target.

`AGENTS.md` holds Expo's own guidance. Most importantly: Expo APIs change every SDK, so check the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`) before using an Expo API instead of relying on memory, and always add packages with `npx expo install`.

## Commands

```
npx expo start                     # dev server (Expo Go / dev build)
npm run typecheck                  # tsc --noEmit
npm run lint                       # expo lint
npm test                           # jest, all tests
npx jest src/domain/__tests__/budgets.test.ts          # single file
npx jest src/domain/__tests__/budgets.test.ts -t "warns"  # single test
npx expo export --platform ios --output-dir <dir>      # bundle check without a device
npx expo-doctor                    # dependency/config health
```

Run typecheck, lint and tests before calling a task done. Native iOS builds need macOS + Xcode or EAS (`npx eas-cli@latest build`); the dev machine is Windows.

TypeScript 6 doesn't auto-include `@types/*`, so global types are listed in `tsconfig.json` `compilerOptions.types`. `@/*` maps to `src/*`.

## Architecture

Layers, with dependencies pointing down only:

- `src/app/`: Expo Router routes only. `(tabs)/` holds Overview, Transactions, Budget and Settings. `transaction.tsx` is the add/edit modal (`?id=` to edit). `_layout.tsx` loads settings and wallet data, and shows a recovery screen if the data file can't be read.
- `src/components/`: shared UI (`ui.tsx` primitives, `wallet.tsx` domain-aware pieces) and `useBackupActions` (export/restore flows).
- `src/state/`: Zustand stores. `walletStore.ts` is a factory taking a `WalletRepository`. `wallet.ts` builds the app instance and the hooks. Selectors must return stable references (Zustand v5 loops otherwise), so use `useTransactions()`/`useBudgets()` rather than `s.data?.x ?? []`.
- `src/domain/`: pure TypeScript business rules (money, dates, transactions, budgets, data schema/validation/migrations). No React or Expo imports, so it's tested directly with Jest.
- `src/data/`: persistence. `WalletRepository` interface, `JsonFileRepository` (expo-file-system), `MemoryRepository` (tests), `backupFile.ts` (share/pick backup files), and `settingsStorage.ts` (AsyncStorage).

Rules that span files:

- UI never touches files. All wallet data goes through the store and then the repository.
- Store mutations are queued and run one at a time: compute next state, `repository.save`, and only then publish. A failed save leaves state unchanged.
- `JsonFileRepository` writes `wallet.json.tmp` first, deletes `wallet.json`, then renames the temp file. `load()` recovers from the temp file if the main file is missing. If the stored file is invalid, it throws `StorageError` and never overwrites it. The user recovers by restoring a backup (`replaceAll` works even when loading failed).
- `WalletData.version` plus `MIGRATIONS` in `domain/walletData.ts` handle schema upgrades. Bump `CURRENT_VERSION` and add a migration when the persisted shape changes. `parseWalletData` validates everything (amounts, dates, category references and types, duplicate ids) before data is accepted, from disk or from a backup.
- Backups are the wallet data plus `app: 'my-wallet'` and `exportedAt`. Import validates the file fully, then asks for confirmation, then replaces the data.

## Business rules

- Money is a positive integer of đồng (VND only, `MAX_AMOUNT` cap). Never use floats.
- `transactionDate` is a `YYYY-MM-DD` calendar string in device local time. Months group by string prefix, so timezone changes never move transactions.
- income − expense is labelled "Chênh lệch thu chi" / "Income − expenses", not a balance. The app doesn't track opening balances.
- Budgets are a monthly limit per expense category, applied to every month. Status is `warning` at ≥ 80% and `over` when spending is above the limit.
- Built-in categories live in `domain/categories.ts` with a `builtInKey` translated via `category.<key>`. User categories would use `name`.

## i18n and theming

- Strings live in `src/i18n/vi.ts` (source of keys) and `en.ts` (typed against it). Use `useT()` for `t`, `language` and `categoryName`. Language preference is system / vi / en; the system setting resolves to vi on Vietnamese devices and English otherwise.
- Colors come from `useTheme()` (light/dark tokens in `src/theme`). Don't hard-code colors in screens.

## Not built yet

Optional Face ID / PIN app lock, custom category management UI, charts beyond the per-category bars, and UI/component tests (`@testing-library/react-native` is installed but unused).
