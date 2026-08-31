import type { SQLiteDatabase } from 'expo-sqlite';
import type { BudgetMode, BudgetPeriod } from '../types';

export async function getPeriodByKey(
  db: SQLiteDatabase,
  periodKey: string
): Promise<BudgetPeriod | null> {
  return db.getFirstAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods WHERE period_key = ?',
    [periodKey]
  );
}

export async function getLatestPeriod(db: SQLiteDatabase): Promise<BudgetPeriod | null> {
  return db.getFirstAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods ORDER BY cycle_start_date DESC LIMIT 1'
  );
}

export async function listPeriods(db: SQLiteDatabase): Promise<BudgetPeriod[]> {
  return db.getAllAsync<BudgetPeriod>(
    'SELECT * FROM budget_periods ORDER BY cycle_start_date DESC'
  );
}

export async function getPeriod(db: SQLiteDatabase, id: number): Promise<BudgetPeriod | null> {
  return db.getFirstAsync<BudgetPeriod>('SELECT * FROM budget_periods WHERE id = ?', [id]);
}

export async function updatePeriod(
  db: SQLiteDatabase,
  id: number,
  patch: Partial<{ salary_amount: number; budget_mode: BudgetMode }>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(`UPDATE budget_periods SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function createPeriod(
  db: SQLiteDatabase,
  data: {
    periodKey: string;
    cycleStartDate: string;
    cycleEndDate: string;
    salaryAmount: number;
    budgetMode: BudgetMode;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO budget_periods (period_key, cycle_start_date, cycle_end_date, salary_amount, budget_mode, created_at, closed)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
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
