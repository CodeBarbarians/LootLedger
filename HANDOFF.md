# LootLedger — Session Handoff

## Immediate next step (pending when this handoff was written)

A new EAS preview APK build is **in progress**, at commit `ce5b373` (the full personal-finance feature build described below — this is a much bigger diff than any previous build). Check it with:

```bash
cd /d/Projects/LootLedger
npx eas-cli@latest build:list --platform android --limit 1 --non-interactive
```

Or open: https://expo.dev/accounts/codebarbarian1/projects/LootLedger/builds/12a8d507-c2f6-4601-ac3c-0e83c808143d

Once `Status: finished`, grab `Application Archive URL` for the direct `.apk` download link. **This has not been visually verified on-device yet — that is the single most important next step.** In particular: does the app open cleanly on the phone that already has the old (pre-this-session) SQLite database on it? That phone is at `DB_VERSION 2` and this build's migration chain (`v2 → v8`) is the highest-risk code shipped this session — it rebuilds `categories`/`budget_periods`/`bills` tables in place. It was adversarially reviewed twice and passed `PRAGMA foreign_key_check` reasoning, but nothing beats an actual on-device cold start against real data. If the app fails to open or existing categories/months/transactions appear to vanish after installing this build, that migration is the first place to look — see "Bugs found & fixed" below for exactly what was already caught and fixed there.

There is also a **separate, independently-running background session** (spawned via a suggested-task chip, not part of this handoff's own work) titled "Add profile_id to backup export/import for multi-profile fidelity" — check whether it finished and, if so, review/merge its changes before assuming the backup format is fully done. It was working in its own session, not this one.

If EAS gives "Service Unavailable" / GraphQL errors, check https://status.expo.dev.

## What this app is

LootLedger — a personal finance app (Expo/React Native), styled to match a shared "Code Barbarians Budget" design (dark theme, orange accent `#FF5A1F`, Space Grotesk/Space Mono fonts). It started as a monthly budget tracker (percent/fixed allocation across categories, subcategories with paid/unpaid status, ad-hoc spend logging, month-by-month history, JSON backup) and this session grew it into a broader **local-only, manual-entry personal finance manager**: multiple independent budget profiles, accounts & net worth, debt payoff tracking, bills & subscriptions with local reminders, and savings goals. No backend, no bank sync (Plaid or otherwise) — everything lives in on-device SQLite.

## Repo & remote

- Local: `D:\Projects\LootLedger`
- Remote: `https://github.com/CodeBarbarians/LootLedger.git`, branch `main`. **Not yet pushed** as of this handoff — 11 new local commits since the last push (`443b5db` through `ce5b373`); push only when explicitly asked, per this project's working style.
- EAS project: linked, owner account `codebarbarian1` (alishoaib074@gmail.com). `projectId` is in `app.json`.

## What happened this session (chronological)

1. **App icon replaced** with the Code Barbarians horned-helm mark (source SVGs at `D:\company\Company_Statics\svg\1a-horned-helm-*.svg`) — all six asset slots (`icon.png`, `splash-icon.png`, `android-icon-{foreground,background,monochrome}.png`, `favicon.png`) regenerated via `sharp-cli` (rasterized composited SVG variants, no new persistent dependency) and dropped in at their existing paths/dimensions.
2. **Global keyboard-covering-input bug fixed**: the shared `Screen` component ([src/components/app/Screen.tsx](src/components/app/Screen.tsx)) had no `KeyboardAvoidingView` (unlike `BottomSheet.tsx`, which already did) — every full-page screen with a text field could get it hidden behind the keyboard. Fixed with the same `Platform.OS === 'ios' ? 'padding' : 'height'` pattern, plus `"softwareKeyboardLayoutMode": "resize"` added to `app.json`'s Android config.
3. **The user asked for a plan to grow this into an "end-to-end personal finance app,"** scoped via clarifying questions to: Accounts & net worth, Bills & subscriptions, Debt payoff tracking, Goals — manual-entry only, no backend. Mid-planning the user also asked for a **Master Data hub** and **multiple independent budget profiles** (the app previously assumed exactly one ongoing budget). The full plan (still saved at the path shown by `/plan` history, or see the commit messages below for the equivalent breakdown) was approved and then built end-to-end via an orchestrated multi-agent workflow — see the commit list below for exactly what shipped.
4. **Two rounds of adversarial review were run against the build** (not just self-reported "done" from the implementing agents) — see "Bugs found & fixed" below for what they caught.
5. A fresh EAS build was kicked off at the final commit (`ce5b373`) — see "Immediate next step" above.

## Commits this session (newest first)

```
ce5b373 Fix issues found in final review of personal-finance build
c34655f Extend backup format to cover accounts, debts, bills, and goals
9afb4ca Add goals and savings targets
321636a Add local reminder notifications for bills
8f794d6 Add bills and subscriptions tracking
a1a2356 Add debt payoff tracking
1ac4085 Add accounts and net worth tracking
9ba4baa Add Master Data hub screen
4d14d90 Fix issues found in multi-profile migration review
aa10a83 Add multi-budget-profile architecture
443b5db Apply Code Barbarians app icon and fix keyboard-covering-input bug
```
(base was `d918db1`, the previous handoff's tip)

## Tech stack (updated)

- **Expo SDK 54**, React Native 0.81.5, React 19.1.0 — unchanged, see "Why SDK 54" below (carried over from last session, still true)
- **gluestack-ui v2** (alpha) + **NativeWind v5** (preview) for styling
- `expo-sqlite` (16.x) for local storage, `@tanstack/react-query` as the data layer
- `@react-navigation` (native-stack + bottom-tabs)
- `expo-file-system` + `expo-sharing` + `expo-document-picker` for JSON backup export/import
- **`expo-notifications` (`~0.32.17`, newly added this session)** for local bill-due-date reminders — version was read directly from `node_modules/expo/bundledNativeModules.json` (the exact file `expo install` consults) and a real `npm install` was run, not guessed/hand-pinned.
- `@expo-google-fonts/space-grotesk` + `@expo-google-fonts/space-mono`

### Why SDK 54, not 57

The public Expo Go app only supports SDK 54 as of last session (SDK 55 was pending store approval). Unchanged this session.

### Local dev environment quirks (carried over, still true — untested again this session)

- **Node version matters**: default Node on this machine is 24.x, which has real bugs with the Expo CLI. **Use Node 22 LTS**: `nvm use 22.20.0` (nvm-windows at `C:\nvm4w`). Fallback: `EXPO_NO_DEPENDENCY_VALIDATION=1`.
- **Local Android/Gradle builds are blocked** on this machine (Gradle daemon can't open a loopback socket — corporate firewall/endpoint-security policy, no admin access). **EAS cloud build is the working path.** JDK 17 at `C:\Users\ShoaibAli\dev-tools\jdk-17.0.20.1+1`, Android SDK at `C:\Users\ShoaibAli\Android\Sdk`.
- **`expo start --web` was tried this session (to visually verify the keyboard fix) and did not work reliably** in this environment — Metro hung at "Starting Metro Bundler" for 1+ minute with no further log output, then the process died. This is a new data point on top of the previously-documented LAN/chunked-transfer issues with physical-device Expo Go — web preview isn't a reliable fallback either on this machine. **Standalone EAS APK builds remain the most reliable way to actually see the app.**

## Architecture (updated — new pieces this session in bold)

- `src/db/schema.ts` — SQL DDL (now 12 tables — see below) + `DEFAULT_CATEGORY_SEED`
- `src/db/migrations.ts` — versioned migration runner, **`DB_VERSION` now `8`** (was 2). Steps 2→3 (multi-profile) and 7→8 (bills FK fix) both do a full SQLite table-rebuild (`CREATE ... _new` → copy → `DROP` → `RENAME`) rather than `ALTER TABLE`, because SQLite can't alter constraints/FK clauses in place — both are wrapped in `withTransactionAsync` with `PRAGMA foreign_key_check` before commit, and toggle `PRAGMA foreign_keys OFF/ON` *around* (not inside) the transaction per SQLite's documented rebuild procedure. **`PRAGMA foreign_keys = ON` now runs before the early-return** at the top of `migrateDbIfNeeded` (a real bug: it previously ran after, so FK enforcement — and every `ON DELETE CASCADE`/`SET NULL` in the schema — was silently inert on almost every real app launch).
- `src/db/repositories/*.ts` — **new: `profiles.ts`, `accounts.ts`, `debts.ts`, `bills.ts`, `goals.ts`**, plus existing ones updated to take a `profileId` param
- `src/hooks/*.ts` — **new: `useProfiles.ts` (incl. `useActiveProfile()`), `useAccounts.ts`, `useDebts.ts`, `useBills.ts`, `useBillNotifications.ts`, `useGoals.ts`**
- `src/utils/payoff.ts` — **new**: pure snowball/avalanche debt-payoff projection calculation (no DB table)
- `src/theme/`, `components/ui/*` — unchanged
- `src/screens/*` — **new: `BudgetProfilesScreen`, `MasterDataScreen`, `AccountsScreen`, `DebtsScreen`, `BillsScreen`, `GoalsScreen`** (all follow the `CategoryManagementScreen` sidebar[104px]+detail-panel template), plus every existing screen updated to thread `profileId` through
- `src/navigation/` — root stack gained `BudgetProfiles`, `MasterData`, `Accounts`, `Debts`, `Bills`, `Goals` as sibling stack screens (same pattern as `CategoryManagement` — not tabs)

### All 12 tables (post this session)

`budget_profiles` (new) → `settings`, `categories`, `budget_periods` (all now `profile_id`-scoped) → `allocations`, `subcategories`, `transactions` (unchanged, scoped transitively via `period_id`) → **new:** `accounts` → `account_balance_snapshots`; `debts` → `debt_payments`; `bills` → `bill_payments`; `goals` → `goal_contributions`.

## Feature list (as of this session)

Everything from last session's list, plus:
- **Budget Profiles**: multiple independent budgets (e.g. "Personal", "Freelance"), each with its own salary/currency/cycle/categories/months. Switcher on the Dashboard header; management screen for create/rename/recolor/switch/archive.
- **Master Data hub**: one screen linking to Categories/Accounts/Debts/Bills/Goals management (reached from Settings).
- **Accounts & Net Worth**: manual account balances (checking/savings/credit card/cash/investment/loan), a snapshot history per balance edit, a net-worth stat and trend.
- **Debt payoff tracking**: debts with balance/APR/minimum payment, payment logging, snowball vs. avalanche payoff projections.
- **Bills & Subscriptions**: recurring bills with due-day/recurrence/reminder lead time, "mark paid" (optionally logs a real transaction against the linked budget category), local push reminders.
- **Goals**: named savings targets with a contribution log and progress bar, dashboard progress strip.
- Backup/restore JSON now covers all 12 tables.

## Bugs found & fixed this session

Carried over from last session (still true, unchanged): `RootNavigator` initialRouteName timing fix, subcategory PAID-pill-deletes-instead-of-unpays fix, Android `includeFontPadding`/inline-style money-field fixes, bottom-sheet keyboard-avoiding fix, `TopBar` component for back navigation.

**New this session:**
1. App icon/splash/favicon were still Expo scaffold defaults — replaced with the real brand mark.
2. **Global** (not just bottom-sheet) keyboard-covering-input bug — see `Screen.tsx` above.
3. **`resetToDefaultBudget()` was profile-unscoped** — it deleted `budget_periods`/`categories` for *every* profile, not just the active one. Found and fixed during the Phase 1 build itself (before any review pass), while the implementing agent was auditing every file in `src/db/**` for the zero-tsc-error constraint.
4. **(High severity, caught by adversarial review #1)** The `v2→v3` migration used plain `ALTER TABLE ADD COLUMN` for `categories.profile_id`/`budget_periods.profile_id`, which can't replace `budget_periods`' pre-existing global `UNIQUE(period_key)` constraint with the new composite `UNIQUE(profile_id, period_key)`. On any *upgraded* (non-fresh-install) database, creating a second profile and adding a period with a colliding `period_key` (near-certain for calendar-style keys like "2026-09") would throw an unhandled UNIQUE constraint violation — breaking the core feature being shipped, for upgraded installs only. Fixed via a full table rebuild instead of `ALTER TABLE`.
5. **(Medium, same review)** `profile_id` ended up nullable and without `ON DELETE CASCADE` on upgraded DBs vs. fresh installs (same root cause as #4) — fixed by the same rebuild.
6. **(Low/medium, same review)** The migration's `PRAGMA user_version` bump happened *after* its transaction committed rather than inside it — a process kill in that window would have caused the block to unsafely re-run on next launch (duplicate "Personal" profile row, then a hard crash on `ALTER TABLE ... duplicate column name`). Fixed by moving the version bump inside the transaction (SQLite's `user_version` lives in the transactional file header, so it commits/rolls back atomically with the rest of the migration).
7. **(High, caught by the final cross-cutting review)** `PRAGMA foreign_keys = ON` ran *after* the migration runner's early-return, so it silently never activated once the DB was already at the current version — i.e. on almost every real app launch. Every `ON DELETE CASCADE` in the schema (and the fix in #3/#4 above) was inert. Fixed by moving both `PRAGMA` calls above the early-return.
8. **(Medium, same review)** `bills.category_id` had no `ON DELETE` clause (default `RESTRICT`) — once FK enforcement was actually turned on (per #7), deleting a category with a bill attached would throw instead of gracefully unlinking. Fixed via `ON DELETE SET NULL` + a `v7→v8` table-rebuild migration step for existing installs.
9. **(Medium, same review)** `getNetWorth()` excludes archived accounts but `getNetWorthTrend()` included them — the headline net-worth number and the most recent point on its own trend chart could disagree. Fixed to filter consistently; a related latent sign bug (an archived account's balance would've been silently counted as an *asset* every month in the trend, regardless of `is_liability`) was caught and fixed in the same pass.

## Design reference

Unchanged from last session: `.dc.html` Claude Design canvas export; brand assets at `D:\company\Company_Statics`. Company/brand name: **Code Barbarians**.

## If picking this up fresh

1. Check the pending EAS build (see top of this doc) and check whether the separately-spawned "backup export/import profile_id fidelity" background session finished.
2. Install the new APK on the device that already has old (`DB_VERSION 2`) real data on it, and confirm: the app opens without crashing, all pre-existing categories/months/transactions are visible under an auto-created "Personal" profile, and the new Accounts/Debts/Bills/Goals/Master-Data/Budget-Profiles screens are reachable and functional. This is the first on-device confirmation of any of this session's work.
3. `npx tsc --noEmit` is clean as of `ce5b373` — run it after any changes.
4. 11 local commits are unpushed (`443b5db` through `ce5b373`) — push only when explicitly asked.
5. `expo-notifications`' `app.json` plugin entry references no custom notification icon asset (none exists in `./assets`) — fine for now, but if a dedicated small monochrome notification icon is ever wanted, that's a follow-up, not a bug.
