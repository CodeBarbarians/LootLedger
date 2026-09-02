import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_CATEGORY_SEED } from '../schema';
import type { Category, CategoryKind } from '../types';

export async function listCategories(
  db: SQLiteDatabase,
  profileId: number,
  includeArchived = false
): Promise<Category[]> {
  if (includeArchived) {
    return db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE profile_id = ? ORDER BY sort_order ASC, id ASC',
      [profileId]
    );
  }
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE profile_id = ? AND archived = 0 ORDER BY sort_order ASC, id ASC',
    [profileId]
  );
}

export async function getCategory(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<Category | null> {
  return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function seedDefaultCategoriesIfEmpty(
  db: SQLiteDatabase,
  profileId: number
): Promise<void> {
  // Every profile gets the fallback, including ones that already have categories.
  await ensureUncategorized(db, profileId);

  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE profile_id = ? AND is_system = 0',
    [profileId]
  );
  if (existing && existing.count > 0) return;

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < DEFAULT_CATEGORY_SEED.length; i++) {
      const c = DEFAULT_CATEGORY_SEED[i];
      await db.runAsync(
        'INSERT INTO categories (profile_id, name, color, kind, sort_order, is_default, archived) VALUES (?, ?, ?, ?, ?, 1, 0)',
        [profileId, c.name, c.color, c.kind, i]
      );
    }
  });
}

export async function createCategory(
  db: SQLiteDatabase,
  profileId: number,
  data: { name: string; color: string; kind: CategoryKind }
): Promise<number> {
  const maxRow = await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) as maxOrder FROM categories WHERE profile_id = ?',
    [profileId]
  );
  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
  const result = await db.runAsync(
    'INSERT INTO categories (profile_id, name, color, kind, sort_order, is_default, archived) VALUES (?, ?, ?, ?, ?, 0, 0)',
    [profileId, data.name, data.color, data.kind, sortOrder]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  patch: Partial<Pick<Category, 'name' | 'color' | 'sort_order' | 'kind'>>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(`UPDATE categories SET ${setClause} WHERE id = ? AND profile_id = ?`, [
    ...values,
    id,
    profileId,
  ]);
}

export async function archiveCategory(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE categories SET archived = 1 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function unarchiveCategory(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE categories SET archived = 0 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

/**
 * The per-profile fallback category. Deleting a category moves its history here
 * rather than destroying it, so it must always exist and can never be deleted.
 */
export async function ensureUncategorized(
  db: SQLiteDatabase,
  profileId: number
): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE profile_id = ? AND is_system = 1',
    [profileId]
  );
  if (existing) return existing.id;

  const result = await db.runAsync(
    `INSERT INTO categories (profile_id, name, color, kind, sort_order, is_default, is_system, archived)
     VALUES (?, 'Uncategorized', '#8A7A66', 'expense', 999, 0, 1, 0)`,
    [profileId]
  );
  return result.lastInsertRowId;
}

/**
 * Deletes a category, reassigning everything that referenced it to the profile's
 * Uncategorized category. Nothing is destroyed: past months keep their spend, the
 * money just shows as uncategorized.
 */
export async function deleteCategory(db: SQLiteDatabase, categoryId: number): Promise<void> {
  const category = await db.getFirstAsync<{ profile_id: number; is_system: number }>(
    'SELECT profile_id, is_system FROM categories WHERE id = ?',
    [categoryId]
  );
  if (!category) return;
  if (category.is_system) {
    throw new Error('Uncategorized cannot be deleted — it is where deleted categories move their history.');
  }

  const fallbackId = await ensureUncategorized(db, category.profile_id);

  await db.withTransactionAsync(async () => {
    // allocations is UNIQUE(period_id, category_id), so a period that already has
    // an Uncategorized allocation has to absorb this one rather than gain a second.
    const allocations = await db.getAllAsync<{
      id: number;
      period_id: number;
      percent: number | null;
      amount_allocated: number;
    }>('SELECT id, period_id, percent, amount_allocated FROM allocations WHERE category_id = ?', [
      categoryId,
    ]);

    for (const allocation of allocations) {
      const existing = await db.getFirstAsync<{ id: number; percent: number | null; amount_allocated: number }>(
        'SELECT id, percent, amount_allocated FROM allocations WHERE period_id = ? AND category_id = ?',
        [allocation.period_id, fallbackId]
      );
      if (existing) {
        await db.runAsync(
          'UPDATE allocations SET percent = ?, amount_allocated = ? WHERE id = ?',
          [
            existing.percent === null && allocation.percent === null
              ? null
              : (existing.percent ?? 0) + (allocation.percent ?? 0),
            existing.amount_allocated + allocation.amount_allocated,
            existing.id,
          ]
        );
        await db.runAsync('DELETE FROM allocations WHERE id = ?', [allocation.id]);
      } else {
        await db.runAsync('UPDATE allocations SET category_id = ? WHERE id = ?', [
          fallbackId,
          allocation.id,
        ]);
      }
    }

    await db.runAsync('UPDATE subcategories SET category_id = ? WHERE category_id = ?', [
      fallbackId,
      categoryId,
    ]);
    await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
      fallbackId,
      categoryId,
    ]);
    await db.runAsync('UPDATE bills SET category_id = ? WHERE category_id = ?', [
      fallbackId,
      categoryId,
    ]);

    await db.runAsync('DELETE FROM categories WHERE id = ?', [categoryId]);
  });
}
