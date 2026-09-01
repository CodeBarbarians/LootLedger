import type { SQLiteDatabase } from 'expo-sqlite';
import { seedDefaultCategoriesIfEmpty } from './categories';

/** Wipes all budget data (categories, periods, allocations, subcategories, transactions) and reseeds the default budget. Currency/cycle settings are left untouched. */
export async function resetToDefaultBudget(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM budget_periods');
    await db.runAsync('DELETE FROM categories');
  });
  await seedDefaultCategoriesIfEmpty(db);
}
