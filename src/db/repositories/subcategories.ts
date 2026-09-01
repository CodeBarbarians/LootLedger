import type { SQLiteDatabase } from 'expo-sqlite';
import type { Subcategory, SubcategoryStatus } from '../types';

function computeStatus(budgeted: number, paid: number): SubcategoryStatus {
  if (paid <= 0) return 'unpaid';
  if (paid >= budgeted) return 'paid';
  return 'partial';
}

export async function listSubcategoriesForCategory(
  db: SQLiteDatabase,
  periodId: number,
  categoryId: number
): Promise<Subcategory[]> {
  return db.getAllAsync<Subcategory>(
    'SELECT * FROM subcategories WHERE period_id = ? AND category_id = ? ORDER BY created_at ASC',
    [periodId, categoryId]
  );
}

export async function listSubcategoriesForPeriod(
  db: SQLiteDatabase,
  periodId: number
): Promise<Subcategory[]> {
  return db.getAllAsync<Subcategory>(
    'SELECT * FROM subcategories WHERE period_id = ? ORDER BY created_at ASC',
    [periodId]
  );
}

export async function createSubcategory(
  db: SQLiteDatabase,
  data: { periodId: number; categoryId: number; name: string; amountBudgeted: number }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO subcategories (period_id, category_id, name, amount_budgeted, amount_paid, status, created_at, paid_at)
     VALUES (?, ?, ?, ?, 0, 'unpaid', ?, NULL)`,
    [data.periodId, data.categoryId, data.name, data.amountBudgeted, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deleteSubcategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM subcategories WHERE id = ?', [id]);
}

/** Records a payment against a subcategory (full "Mark as Paid" or a partial amount) and logs it as a transaction. */
export async function paySubcategory(
  db: SQLiteDatabase,
  data: { subcategoryId: number; amount: number; note?: string }
): Promise<void> {
  const sub = await db.getFirstAsync<Subcategory>('SELECT * FROM subcategories WHERE id = ?', [
    data.subcategoryId,
  ]);
  if (!sub) throw new Error('Subcategory not found');

  const now = new Date().toISOString();
  const newPaid = sub.amount_paid + data.amount;
  const newStatus = computeStatus(sub.amount_budgeted, newPaid);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (period_id, category_id, subcategory_id, amount, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sub.period_id, sub.category_id, sub.id, data.amount, data.note ?? null, now]
    );
    await db.runAsync(
      `UPDATE subcategories SET amount_paid = ?, status = ?, paid_at = ? WHERE id = ?`,
      [newPaid, newStatus, newStatus === 'paid' ? now : sub.paid_at, sub.id]
    );
  });
}

/** Marks a subcategory fully paid in one step (pays the remaining pending amount). */
export async function markSubcategoryPaid(db: SQLiteDatabase, subcategoryId: number): Promise<void> {
  const sub = await db.getFirstAsync<Subcategory>('SELECT * FROM subcategories WHERE id = ?', [
    subcategoryId,
  ]);
  if (!sub) throw new Error('Subcategory not found');
  const remaining = sub.amount_budgeted - sub.amount_paid;
  if (remaining <= 0) return;
  await paySubcategory(db, { subcategoryId, amount: remaining, note: 'Marked as paid' });
}

/** Reverts a subcategory back to unpaid: removes its payment transactions and resets amount_paid to 0. */
export async function unpaySubcategory(db: SQLiteDatabase, subcategoryId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE subcategory_id = ?', [subcategoryId]);
    await db.runAsync(
      `UPDATE subcategories SET amount_paid = 0, status = 'unpaid', paid_at = NULL WHERE id = ?`,
      [subcategoryId]
    );
  });
}
