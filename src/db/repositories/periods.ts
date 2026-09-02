import type { SQLiteDatabase } from 'expo-sqlite';
import type { BudgetMode, BudgetPeriod } from '../types';

export async function getPeriodByKey(
  db: SQLiteDatabase,
  profileId: number,
  periodKey: string
): Promise<BudgetPeriod | null> {
  return db.getFirstAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods WHERE profile_id = ? AND period_key = ?',
    [profileId, periodKey]
  );
}

export async function getLatestPeriod(
  db: SQLiteDatabase,
  profileId: number
): Promise<BudgetPeriod | null> {
  return db.getFirstAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods WHERE profile_id = ? ORDER BY cycle_start_date DESC LIMIT 1',
    [profileId]
  );
}

export async function listPeriods(db: SQLiteDatabase, profileId: number): Promise<BudgetPeriod[]> {
  return db.getAllAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods WHERE profile_id = ? ORDER BY cycle_start_date DESC',
    [profileId]
  );
}

export async function getPeriod(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<BudgetPeriod | null> {
  return db.getFirstAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods WHERE id = ? AND profile_id = ?',
    [id, profileId]
  );
}

export async function updatePeriod(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  patch: Partial<{ salary_amount: number; budget_mode: BudgetMode }>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(`UPDATE budget_periods SET ${setClause} WHERE id = ? AND profile_id = ?`, [
    ...values,
    id,
    profileId,
  ]);
}

export async function createPeriod(
  db: SQLiteDatabase,
  profileId: number,
  data: {
    periodKey: string;
    cycleStartDate: string;
    cycleEndDate: string;
    salaryAmount: number;
    budgetMode: BudgetMode;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO budget_periods (profile_id, period_key, cycle_start_date, cycle_end_date, salary_amount, budget_mode, created_at, closed)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      profileId,
      data.periodKey,
      data.cycleStartDate,
      data.cycleEndDate,
      data.salaryAmount,
      data.budgetMode,
      new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
}
