import type { SQLiteDatabase } from 'expo-sqlite';
import type { BudgetMode, BudgetProfile } from '../types';

export async function listProfiles(
  db: SQLiteDatabase,
  includeArchived = false
): Promise<BudgetProfile[]> {
  if (includeArchived) {
    return db.getAllAsync<BudgetProfile>(
      'SELECT * FROM budget_profiles ORDER BY sort_order ASC, id ASC'
    );
  }
  return db.getAllAsync<BudgetProfile>(
    'SELECT * FROM budget_profiles WHERE archived = 0 ORDER BY sort_order ASC, id ASC'
  );
}

export async function getProfile(db: SQLiteDatabase, id: number): Promise<BudgetProfile | null> {
  return db.getFirstAsync<BudgetProfile>('SELECT * FROM budget_profiles WHERE id = ?', [id]);
}

export async function createProfile(
  db: SQLiteDatabase,
  data: {
    name: string;
    color: string;
    currencyCode: string;
    currencySymbol: string;
    cycleStartDay: number;
    salaryAmount: number;
    budgetMode: BudgetMode;
  }
): Promise<number> {
  const maxRow = await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) as maxOrder FROM budget_profiles'
  );
  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO budget_profiles (name, color, currency_code, currency_symbol, cycle_start_day, salary_amount, budget_mode, onboarded, archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [
      data.name,
      data.color,
      data.currencyCode,
      data.currencySymbol,
      data.cycleStartDay,
      data.salaryAmount,
      data.budgetMode,
      sortOrder,
      new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
}

export async function updateProfile(
  db: SQLiteDatabase,
  id: number,
  patch: Partial<
    Pick<
      BudgetProfile,
      | 'name'
      | 'color'
      | 'currency_code'
      | 'currency_symbol'
      | 'cycle_start_day'
      | 'salary_amount'
      | 'budget_mode'
      | 'onboarded'
      | 'sort_order'
    >
  >
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(`UPDATE budget_profiles SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function archiveProfile(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE budget_profiles SET archived = 1 WHERE id = ?', [id]);
}

export async function unarchiveProfile(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE budget_profiles SET archived = 0 WHERE id = ?', [id]);
}
