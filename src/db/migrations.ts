import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_VERSION = 2;

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
      `INSERT OR IGNORE INTO settings (id, salary_amount, budget_mode, currency_code, currency_symbol, cycle_start_day, onboarded, last_backup_at)
       VALUES (1, 0, 'percent', 'PKR', 'Rs', 1, 0, NULL)`
    );
    currentVersion = 2;
  }

  if (currentVersion === 1) {
    await db.execAsync("ALTER TABLE categories ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense'");
    await db.execAsync('ALTER TABLE settings ADD COLUMN last_backup_at TEXT');
    currentVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
