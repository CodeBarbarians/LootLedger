import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_VERSION = 5;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DB_VERSION) {
    return;
  }

  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  if (currentVersion === 0) {
    await db.execAsync(CREATE_TABLES_SQL);
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (id, active_profile_id, last_backup_at)
       VALUES (1, NULL, NULL)`
    );
    currentVersion = 5;
  }

  if (currentVersion === 1) {
    await db.execAsync("ALTER TABLE categories ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense'");
    await db.execAsync('ALTER TABLE settings ADD COLUMN last_backup_at TEXT');
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    const existingSettings = await db.getFirstAsync<{
      salary_amount: number;
      budget_mode: string;
      currency_code: string;
      currency_symbol: string;
      cycle_start_day: number;
      onboarded: number;
    }>(
      'SELECT salary_amount, budget_mode, currency_code, currency_symbol, cycle_start_day, onboarded FROM settings WHERE id = 1'
    );

    // The table rebuilds below drop and recreate `categories` and `budget_periods`
    // (both are FK parents of allocations/subcategories/transactions), so foreign key
    // enforcement must be off for the duration — SQLite's ALTER-TABLE-by-rebuild
    // procedure (see sqlite.org "Making Other Kinds Of Table Schema Changes").
    // PRAGMA foreign_keys can't be changed inside a transaction, so toggle it
    // around, not inside, withTransactionAsync.
    await db.execAsync('PRAGMA foreign_keys = OFF');
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS budget_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#FF5A1F',
            currency_code TEXT NOT NULL DEFAULT 'PKR',
            currency_symbol TEXT NOT NULL DEFAULT 'Rs',
            cycle_start_day INTEGER NOT NULL DEFAULT 1,
            salary_amount REAL NOT NULL DEFAULT 0,
            budget_mode TEXT NOT NULL DEFAULT 'percent',
            onboarded INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          )
        `);

        const profileResult = await db.runAsync(
          `INSERT INTO budget_profiles (name, color, currency_code, currency_symbol, cycle_start_day, salary_amount, budget_mode, onboarded, archived, sort_order, created_at)
           VALUES (?, '#FF5A1F', ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
          [
            'Personal',
            existingSettings?.currency_code ?? 'PKR',
            existingSettings?.currency_symbol ?? 'Rs',
            existingSettings?.cycle_start_day ?? 1,
            existingSettings?.salary_amount ?? 0,
            existingSettings?.budget_mode ?? 'percent',
            existingSettings?.onboarded ?? 0,
            new Date().toISOString(),
          ]
        );
        const profileId = profileResult.lastInsertRowId;

        // Plain `ALTER TABLE ... ADD COLUMN profile_id` cannot make the column NOT NULL
        // (with the real per-row value), cannot add ON DELETE CASCADE to the new FK, and
        // — critically for budget_periods — cannot replace the pre-existing column-level
        // `period_key TEXT NOT NULL UNIQUE` with the composite `UNIQUE(profile_id, period_key)`
        // that fresh installs get. All three require rebuilding the table, so do that here
        // rather than ALTER TABLE, to bring upgraded databases to the exact same schema
        // CREATE_TABLES_SQL gives fresh installs.
        await db.execAsync(`
          CREATE TABLE categories_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#FF5A1F',
            kind TEXT NOT NULL DEFAULT 'expense',
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_default INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0
          )
        `);
        await db.runAsync(
          `INSERT INTO categories_new (id, profile_id, name, color, kind, sort_order, is_default, archived)
           SELECT id, ?, name, color, kind, sort_order, is_default, archived FROM categories`,
          [profileId]
        );
        await db.execAsync('DROP TABLE categories');
        await db.execAsync('ALTER TABLE categories_new RENAME TO categories');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_profile ON categories(profile_id)');

        await db.execAsync(`
          CREATE TABLE budget_periods_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
            period_key TEXT NOT NULL,
            cycle_start_date TEXT NOT NULL,
            cycle_end_date TEXT NOT NULL,
            salary_amount REAL NOT NULL,
            budget_mode TEXT NOT NULL,
            created_at TEXT NOT NULL,
            closed INTEGER NOT NULL DEFAULT 0,
            UNIQUE(profile_id, period_key)
          )
        `);
        await db.runAsync(
          `INSERT INTO budget_periods_new (id, profile_id, period_key, cycle_start_date, cycle_end_date, salary_amount, budget_mode, created_at, closed)
           SELECT id, ?, period_key, cycle_start_date, cycle_end_date, salary_amount, budget_mode, created_at, closed FROM budget_periods`,
          [profileId]
        );
        await db.execAsync('DROP TABLE budget_periods');
        await db.execAsync('ALTER TABLE budget_periods_new RENAME TO budget_periods');
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_budget_periods_profile ON budget_periods(profile_id)'
        );

        await db.execAsync(
          'ALTER TABLE settings ADD COLUMN active_profile_id INTEGER REFERENCES budget_profiles(id)'
        );
        // Defensive: the singleton settings row is normally seeded at version 0 and enforced
        // by CHECK(id = 1), but if it were ever missing, the UPDATE below would silently
        // affect 0 rows and active_profile_id would stay unset forever. INSERT OR IGNORE
        // guarantees the row exists before we point it at the new profile.
        await db.runAsync('INSERT OR IGNORE INTO settings (id) VALUES (1)');
        await db.runAsync('UPDATE settings SET active_profile_id = ? WHERE id = 1', [profileId]);

        const fkViolations = await db.getAllAsync('PRAGMA foreign_key_check');
        if (fkViolations.length > 0) {
          throw new Error(
            `Migration v2->v3 produced foreign key violations: ${JSON.stringify(fkViolations)}`
          );
        }

        // Bump user_version inside the same transaction so the schema rebuild and the
        // version marker commit (or roll back) atomically — otherwise a process kill
        // between COMMIT and this PRAGMA would re-run this block on next launch against
        // a database that already has the profile_id column, aborting with
        // "duplicate column name" and breaking startup permanently. Hardcoded to 3 (not
        // DB_VERSION) — this step only finishes the v2->v3 rebuild; later steps still
        // need to run before the db is at DB_VERSION.
        await db.execAsync('PRAGMA user_version = 3');
      });
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON');
    }

    currentVersion = 3;
  }

  if (currentVersion === 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'checking',
        color TEXT NOT NULL DEFAULT '#FF5A1F',
        is_liability INTEGER NOT NULL DEFAULT 0,
        current_balance REAL NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS account_balance_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        balance REAL NOT NULL,
        recorded_at TEXT NOT NULL
      )
    `);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profile_id)');
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_account ON account_balance_snapshots(account_id)'
    );
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'credit_card',
        principal_balance REAL NOT NULL DEFAULT 0,
        interest_rate_apr REAL NOT NULL DEFAULT 0,
        minimum_payment REAL NOT NULL DEFAULT 0,
        account_id INTEGER REFERENCES accounts(id),
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        principal_portion REAL NOT NULL DEFAULT 0,
        interest_portion REAL NOT NULL DEFAULT 0,
        note TEXT,
        paid_at TEXT NOT NULL
      )
    `);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_debts_profile ON debts(profile_id)');
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id)'
    );
    currentVersion = 5;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
