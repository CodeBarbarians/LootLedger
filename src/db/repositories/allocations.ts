import type { SQLiteDatabase } from 'expo-sqlite';
import type { Allocation } from '../types';

export async function listAllocationsForPeriod(
  db: SQLiteDatabase,
  periodId: number
): Promise<Allocation[]> {
  return db.getAllAsync<Allocation>(
    'SELECT * FROM allocations WHERE period_id = ?',
    [periodId]
  );
}

export interface AllocationInput {
  categoryId: number;
  percent: number | null;
  amountAllocated: number;
}

/** Replaces every allocation row for a period in one transaction (used by Budget Setup save). */
export async function replaceAllocationsForPeriod(
  db: SQLiteDatabase,
  periodId: number,
  allocations: AllocationInput[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM allocations WHERE period_id = ?', [periodId]);
    for (const a of allocations) {
      await db.runAsync(
        'INSERT INTO allocations (period_id, category_id, percent, amount_allocated) VALUES (?, ?, ?, ?)',
        [periodId, a.categoryId, a.percent, a.amountAllocated]
      );
    }
  });
}
