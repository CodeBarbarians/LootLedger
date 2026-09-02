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
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE profile_id = ?',
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
