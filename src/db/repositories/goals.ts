import type { SQLiteDatabase } from 'expo-sqlite';
import type { Goal, GoalContribution, GoalWithProgress } from '../types';

export async function listGoals(
  db: SQLiteDatabase,
  profileId: number,
  includeArchived = false
): Promise<Goal[]> {
  if (includeArchived) {
    return db.getAllAsync<Goal>(
      'SELECT * FROM goals WHERE profile_id = ? ORDER BY created_at ASC, id ASC',
      [profileId]
    );
  }
  return db.getAllAsync<Goal>(
    'SELECT * FROM goals WHERE profile_id = ? AND archived = 0 ORDER BY created_at ASC, id ASC',
    [profileId]
  );
}

export async function listGoalsWithProgress(
  db: SQLiteDatabase,
  profileId: number,
  includeArchived = false
): Promise<GoalWithProgress[]> {
  const archivedClause = includeArchived ? '' : 'AND g.archived = 0';
  return db.getAllAsync<GoalWithProgress>(
    `SELECT g.*, COALESCE(SUM(c.amount), 0) as contributed
     FROM goals g
     LEFT JOIN goal_contributions c ON c.goal_id = g.id
     WHERE g.profile_id = ? ${archivedClause}
     GROUP BY g.id
     ORDER BY g.created_at ASC, g.id ASC`,
    [profileId]
  );
}

export async function getGoal(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<Goal | null> {
  return db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function createGoal(
  db: SQLiteDatabase,
  profileId: number,
  data: { name: string; targetAmount: number; targetDate: string | null; color: string }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO goals (profile_id, name, target_amount, target_date, color, archived, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [profileId, data.name, data.targetAmount, data.targetDate, data.color, now]
  );
  return result.lastInsertRowId;
}

export async function updateGoal(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  patch: Partial<Pick<Goal, 'name' | 'target_amount' | 'target_date' | 'color'>>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number | null);
  await db.runAsync(`UPDATE goals SET ${setClause} WHERE id = ? AND profile_id = ?`, [
    ...values,
    id,
    profileId,
  ]);
}

export async function archiveGoal(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE goals SET archived = 1 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function unarchiveGoal(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE goals SET archived = 0 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function listGoalContributions(
  db: SQLiteDatabase,
  goalId: number
): Promise<GoalContribution[]> {
  return db.getAllAsync<GoalContribution>(
    'SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY created_at DESC, id DESC',
    [goalId]
  );
}

export async function addContribution(
  db: SQLiteDatabase,
  goalId: number,
  data: { amount: number; note: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO goal_contributions (goal_id, amount, note, created_at) VALUES (?, ?, ?, ?)',
    [goalId, data.amount, data.note, now]
  );
}
