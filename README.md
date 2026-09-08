# LootLedger

A personal finance manager for Android and iOS that works entirely offline.
No account, no server, no sync — your data lives in SQLite on your phone.

**Stack** — React Native (Expo) - TypeScript - expo-sqlite - TanStack Query -
NativeWind - Skia

## What it does

- **Accounts** — track balances across multiple accounts and currencies
- **Transactions** — income, expenses and transfers, with categories and subcategories
- **Budgets** — budget profiles per period, with allocations by category
- **Bills** — recurring bills with scheduled local reminders
- **Debts** — what you owe and what you're owed
- **Goals** — savings targets with progress
- **History** — browse and drill into past periods
- **Charts** — spending breakdowns rendered with Skia
- **Biometric lock** — Face ID / fingerprint on open
- **Backup** — export everything to JSON, import it on another device

## Why offline-first

A budgeting app is opened for twenty seconds at a checkout counter, often on a
bad connection or none at all. A spinner at that moment means the entry never
gets recorded. So there is no network layer: every read and write hits local
SQLite, the UI never waits on anything remote, and moving devices is a file
export rather than an account migration.

The tradeoff is deliberate — no multi-device sync, and a lost phone without a
backup means lost data. Hence the export.

## Layout

```
src/
  db/
    schema.ts        table definitions
    migrations.ts    versioned migrations, run on launch
    client.ts        connection
    repositories/    one module per table: accounts, transactions, budgets,
                     categories, bills, debts, goals, allocations, periods,
                     profiles, settings
  hooks/             useAccounts, useAggregates, useBills, useDebts, useGoals,
                     useBackup, useBillNotifications, ...
  screens/           Dashboard, Accounts, Bills, Budget setup and profiles,
                     Categories, Debts, Goals, History, Data, Settings
  backup/            export.ts, import.ts, format.ts
  components/app/    shared UI
  theme/             design tokens
  navigation/        stack + bottom tabs
```

## Running it

```bash
npm install
npx expo start          # then scan the QR with Expo Go
```

Native builds:

```bash
npx expo run:android
npx expo run:ios
```

`expo-sqlite`, `expo-local-authentication` and `expo-notifications` need a
development build rather than Expo Go if you're testing biometrics or
scheduled reminders. `eas.json` is configured for EAS builds.

## Architecture notes

Data access is a hand-written repository layer over `expo-sqlite` rather than
an ORM. The schema is small and fixed, and the queries that matter are
aggregate rollups per category and period — easier to write and reason about
in SQL than through a query builder.

Migrations are versioned and run on launch. Since the database is the only copy
of a user's data and there's no server to re-seed from, migrations are additive
and never drop a column.

TanStack Query is used against local SQLite rather than HTTP, purely for its
cache invalidation: editing a transaction should refresh the dashboard totals
without either screen knowing about the other.

## Licence

MIT — see [LICENSE](LICENSE).
