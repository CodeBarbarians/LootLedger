import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, AccountType, NetWorth, NetWorthMonthPoint } from '../types';

export async function listAccounts(
  db: SQLiteDatabase,
  profileId: number,
  includeArchived = false
): Promise<Account[]> {
  if (includeArchived) {
    return db.getAllAsync<Account>(
      'SELECT * FROM accounts WHERE profile_id = ? ORDER BY sort_order ASC, id ASC',
      [profileId]
    );
  }
  return db.getAllAsync<Account>(
    'SELECT * FROM accounts WHERE profile_id = ? AND archived = 0 ORDER BY sort_order ASC, id ASC',
    [profileId]
  );
}

export async function getAccount(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<Account | null> {
  return db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function createAccount(
  db: SQLiteDatabase,
  profileId: number,
  data: { name: string; type: AccountType; color: string; isLiability: boolean; currentBalance: number }
): Promise<number> {
  const maxRow = await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) as maxOrder FROM accounts WHERE profile_id = ?',
    [profileId]
  );
  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
  const now = new Date().toISOString();

  let accountId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO accounts (profile_id, name, type, color, is_liability, current_balance, archived, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        profileId,
        data.name,
        data.type,
        data.color,
        data.isLiability ? 1 : 0,
        data.currentBalance,
        sortOrder,
        now,
      ]
    );
    accountId = result.lastInsertRowId;
    await db.runAsync(
      'INSERT INTO account_balance_snapshots (account_id, balance, recorded_at) VALUES (?, ?, ?)',
      [accountId, data.currentBalance, now]
    );
  });
  return accountId;
}

export async function updateAccount(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  patch: Partial<Pick<Account, 'name' | 'type' | 'color' | 'is_liability' | 'sort_order'>>
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(`UPDATE accounts SET ${setClause} WHERE id = ? AND profile_id = ?`, [
    ...values,
    id,
    profileId,
  ]);
}

/** Updates the current balance and records a snapshot row in one transaction — the only path a balance should ever change through. */
export async function updateAccountBalance(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  balance: number
): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE accounts SET current_balance = ? WHERE id = ? AND profile_id = ?',
      [balance, id, profileId]
    );
    await db.runAsync(
      'INSERT INTO account_balance_snapshots (account_id, balance, recorded_at) VALUES (?, ?, ?)',
      [id, balance, now]
    );
  });
}

export async function archiveAccount(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE accounts SET archived = 1 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function unarchiveAccount(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE accounts SET archived = 0 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function getNetWorth(db: SQLiteDatabase, profileId: number): Promise<NetWorth> {
  const accounts = await listAccounts(db, profileId);
  const assets = accounts
    .filter((a) => !a.is_liability)
    .reduce((sum, a) => sum + a.current_balance, 0);
  const liabilities = accounts
    .filter((a) => a.is_liability)
    .reduce((sum, a) => sum + a.current_balance, 0);
  return { assets, liabilities, netWorth: assets - liabilities };
}

/** One point per of the last `months` calendar months, carrying each account's last known balance forward into months with no snapshot. Excludes archived accounts, matching getNetWorth() — archiving an account drops it from net worth and future tracking, so the trend's current-month point must agree with the headline figure. */
export async function getNetWorthTrend(
  db: SQLiteDatabase,
  profileId: number,
  months = 6
): Promise<NetWorthMonthPoint[]> {
  const accounts = await listAccounts(db, profileId, false);
  if (accounts.length === 0) return [];

  const snapshots = await db.getAllAsync<{ account_id: number; balance: number; recorded_at: string }>(
    `SELECT s.account_id, s.balance, s.recorded_at
     FROM account_balance_snapshots s
     JOIN accounts a ON a.id = s.account_id
     WHERE a.profile_id = ? AND a.archived = 0
     ORDER BY s.recorded_at ASC`,
    [profileId]
  );
  if (snapshots.length === 0) return [];

  const isLiability = new Map(accounts.map((a) => [a.id, !!a.is_liability]));

  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const lastByAccount = new Map<number, number>();
  const points: NetWorthMonthPoint[] = [];
  let snapIndex = 0;

  for (const monthKey of monthKeys) {
    const monthCutoff = `${monthKey}-31T23:59:59.999Z`;
    while (snapIndex < snapshots.length && snapshots[snapIndex].recorded_at <= monthCutoff) {
      const s = snapshots[snapIndex];
      lastByAccount.set(s.account_id, s.balance);
      snapIndex++;
    }
    let netWorth = 0;
    for (const [accountId, balance] of lastByAccount) {
      netWorth += isLiability.get(accountId) ? -balance : balance;
    }
    points.push({ monthKey, netWorth });
  }

  return points;
}
