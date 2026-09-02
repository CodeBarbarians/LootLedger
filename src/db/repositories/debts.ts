import type { SQLiteDatabase } from 'expo-sqlite';
import type { Debt, DebtKind, DebtPayment } from '../types';

export async function listDebts(
  db: SQLiteDatabase,
  profileId: number,
  includeArchived = false
): Promise<Debt[]> {
  if (includeArchived) {
    return db.getAllAsync<Debt>(
      'SELECT * FROM debts WHERE profile_id = ? ORDER BY created_at ASC, id ASC',
      [profileId]
    );
  }
  return db.getAllAsync<Debt>(
    'SELECT * FROM debts WHERE profile_id = ? AND archived = 0 ORDER BY created_at ASC, id ASC',
    [profileId]
  );
}

export async function getDebt(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<Debt | null> {
  return db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function createDebt(
  db: SQLiteDatabase,
  profileId: number,
  data: {
    name: string;
    kind: DebtKind;
    principalBalance: number;
    interestRateApr: number;
    minimumPayment: number;
    accountId: number | null;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO debts (profile_id, name, kind, principal_balance, interest_rate_apr, minimum_payment, account_id, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      profileId,
      data.name,
      data.kind,
      data.principalBalance,
      data.interestRateApr,
      data.minimumPayment,
      data.accountId,
      now,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateDebt(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  patch: Partial<
    Pick<
      Debt,
      'name' | 'kind' | 'principal_balance' | 'interest_rate_apr' | 'minimum_payment' | 'account_id'
    >
  >
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number | null);
  await db.runAsync(`UPDATE debts SET ${setClause} WHERE id = ? AND profile_id = ?`, [
    ...values,
    id,
    profileId,
  ]);
}

export async function archiveDebt(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE debts SET archived = 1 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function unarchiveDebt(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE debts SET archived = 0 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function listDebtPayments(
  db: SQLiteDatabase,
  debtId: number
): Promise<DebtPayment[]> {
  return db.getAllAsync<DebtPayment>(
    'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY paid_at DESC, id DESC',
    [debtId]
  );
}

/** Inserts a debt_payments row and decrements debts.principal_balance by the principal portion — the only path a debt balance should ever change through. */
export async function recordPayment(
  db: SQLiteDatabase,
  profileId: number,
  debtId: number,
  data: { amount: number; principalPortion: number; interestPortion: number; note: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO debt_payments (debt_id, amount, principal_portion, interest_portion, note, paid_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [debtId, data.amount, data.principalPortion, data.interestPortion, data.note, now]
    );
    await db.runAsync(
      'UPDATE debts SET principal_balance = MAX(0, principal_balance - ?) WHERE id = ? AND profile_id = ?',
      [data.principalPortion, debtId, profileId]
    );
  });
}
