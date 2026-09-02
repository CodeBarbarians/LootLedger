import type { SQLiteDatabase } from 'expo-sqlite';
import { seedDefaultCategoriesIfEmpty } from './categories';

/** Wipes all budget data (categories, periods, allocations, subcategories, transactions) for a profile and reseeds the default budget. Currency/cycle settings are left untouched. */
export async function resetToDefaultBudget(db: SQLiteDatabase, profileId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM budget_periods WHERE profile_id = ?', [profileId]);
    await db.runAsync('DELETE FROM categories WHERE profile_id = ?', [profileId]);
  });
  await seedDefaultCategoriesIfEmpty(db, profileId);
}
