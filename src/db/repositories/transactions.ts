import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transaction } from '../types';

export async function listTransactionsForCategory(
  db: SQLiteDatabase,
  periodId: number,
  categoryId: number
): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    'SELECT * FROM transactions WHERE period_id = ? AND category_id = ? ORDER BY created_at DESC',
    [periodId, categoryId]
  );
}

/** Ad-hoc spend logged directly against a category (not tied to a subcategory). */
export async function addCategoryTransaction(
  db: SQLiteDatabase,
  data: { periodId: number; categoryId: number; amount: number; note?: string }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (period_id, category_id, subcategory_id, amount, note, created_at)
     VALUES (?, ?, NULL, ?, ?, ?)`,
    [data.periodId, data.categoryId, data.amount, data.note ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}
