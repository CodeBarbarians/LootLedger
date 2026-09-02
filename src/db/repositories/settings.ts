import type { SQLiteDatabase } from 'expo-sqlite';
import type { Settings } from '../types';

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const row = await db.getFirstAsync<Settings>('SELECT * FROM settings WHERE id = 1');
  if (!row) {
    throw new Error('Settings row missing — migration did not seed it');
  }
  return row;
}

export async function updateSettings(
  db: SQLiteDatabase,
  patch: Partial<Omit<Settings, 'id'>>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number | null);
  await db.runAsync(`UPDATE settings SET ${setClause} WHERE id = 1`, values);
}

export async function getActiveProfileId(db: SQLiteDatabase): Promise<number | null> {
  const settings = await getSettings(db);
  return settings.active_profile_id;
}

export async function setActiveProfileId(db: SQLiteDatabase, profileId: number): Promise<void> {
  await db.runAsync('UPDATE settings SET active_profile_id = ? WHERE id = 1', [profileId]);
}
