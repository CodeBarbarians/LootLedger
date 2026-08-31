import type { SQLiteDatabase } from 'expo-sqlite';
import type { BudgetMode, Settings } from '../types';

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const row = await db.getFirstAsync<Settings>('SELECT * FROM settings WHERE id = 1');
  if (!row) {
    throw new Error('Settings row missing — migration did not seed it');
  }
  return row;
}

export async function updateSettings(
  db: SQLiteDatabase,
  patch: Partial<Omit<Settings, 'id'>>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(`UPDATE settings SET ${setClause} WHERE id = 1`, values);
}

export async function completeOnboarding(
  db: SQLiteDatabase,
  data: {
    salary_amount: number;
    budget_mode: BudgetMode;
    currency_code: string;
    currency_symbol: string;
    cycle_start_day: number;
  }
): Promise<void> {
  await db.runAsync(
    `UPDATE settings SET salary_amount = ?, budget_mode = ?, currency_code = ?, currency_symbol = ?, cycle_start_day = ?, onboarded = 1 WHERE id = 1`,
    [data.salary_amount, data.budget_mode, data.currency_code, data.currency_symbol, data.cycle_start_day]
  );
}
