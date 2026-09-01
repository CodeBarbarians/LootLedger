import type { SQLiteDatabase } from 'expo-sqlite';
import type { CategoryWithProgress, PeriodSummary } from '../types';
import { getPeriod, listPeriods } from './periods';

export async function getCategoriesWithProgress(
  db: SQLiteDatabase,
  periodId: number
): Promise<CategoryWithProgress[]> {
  return db.getAllAsync<CategoryWithProgress>(
    `SELECT
       c.id, c.name, c.color, c.kind, c.sort_order, c.is_default, c.archived,
       COALESCE(a.percent, NULL) as percent,
       COALESCE(a.amount_allocated, 0) as allocated,
       COALESCE(t.spent, 0) as spent,
       COALESCE(a.amount_allocated, 0) - COALESCE(t.spent, 0) as remaining
     FROM categories c
     JOIN allocations a ON a.category_id = c.id AND a.period_id = ?
     LEFT JOIN (
       SELECT category_id, SUM(amount) as spent
       FROM transactions
       WHERE period_id = ?
       GROUP BY category_id
     ) t ON t.category_id = c.id
     WHERE c.archived = 0
     ORDER BY c.sort_order ASC, c.id ASC`,
    [periodId, periodId]
  );
}

export async function getPeriodSummary(
  db: SQLiteDatabase,
  periodId: number
): Promise<PeriodSummary | null> {
  const period = await getPeriod(db, periodId);
  if (!period) return null;

  const categories = await getCategoriesWithProgress(db, periodId);
  const totalAllocated = categories.reduce((sum, c) => sum + c.allocated, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);
  const overspend = categories.reduce((sum, c) => sum + Math.max(0, c.spent - c.allocated), 0);
  const toSavings = categories.filter((c) => c.kind === 'saving').reduce((sum, c) => sum + c.allocated, 0);
  const overCount = categories.filter((c) => c.spent > c.allocated + 0.5).length;

  return {
    period,
    totalAllocated,
    totalSpent,
    totalRemaining: totalAllocated - totalSpent,
    overspend,
    saved: period.salary_amount - totalSpent,
    toSavings,
    overCount,
  };
}

export async function getDataStats(
  db: SQLiteDatabase
): Promise<{ categoryCount: number; transactionCount: number; periodCount: number }> {
  const [cat, txn, per] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories WHERE archived = 0'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM budget_periods'),
  ]);
  return {
    categoryCount: cat?.count ?? 0,
    transactionCount: txn?.count ?? 0,
    periodCount: per?.count ?? 0,
  };
}

export async function getHistoryTotals(
  db: SQLiteDatabase
): Promise<{ totalSaved: number; totalOver: number }> {
  const periods = await listPeriods(db);
  let totalSaved = 0;
  let totalOver = 0;
  for (const p of periods) {
    const summary = await getPeriodSummary(db, p.id);
    if (!summary) continue;
    totalSaved += Math.max(0, summary.saved);
    totalOver += summary.overspend;
  }
  return { totalSaved, totalOver };
}
