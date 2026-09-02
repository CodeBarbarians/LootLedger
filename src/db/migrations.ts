import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_VERSION = 3;

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
    currentVersion = 3;
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

      await db.execAsync(
        'ALTER TABLE categories ADD COLUMN profile_id INTEGER REFERENCES budget_profiles(id)'
      );
      await db.runAsync('UPDATE categories SET profile_id = ?', [profileId]);

      await db.execAsync(
        'ALTER TABLE budget_periods ADD COLUMN profile_id INTEGER REFERENCES budget_profiles(id)'
      );
      await db.runAsync('UPDATE budget_periods SET profile_id = ?', [profileId]);

      await db.execAsync(
        'ALTER TABLE settings ADD COLUMN active_profile_id INTEGER REFERENCES budget_profiles(id)'
      );
      await db.runAsync('UPDATE settings SET active_profile_id = ? WHERE id = 1', [profileId]);
    });

    currentVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
