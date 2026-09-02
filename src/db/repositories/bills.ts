import { addMonths, format, getDate, lastDayOfMonth, setDate } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Bill, BillPayment, BillRecurrence, BillWithStatus } from '../types';
import { addCategoryTransaction } from './transactions';

function clampToMonth(date: Date, day: number): Date {
  const lastDay = getDate(lastDayOfMonth(date));
  return setDate(date, Math.min(day, lastDay));
}

// due_day is always treated as a day-of-month for scheduling, regardless of the bill's
// recurrence label — weekly/yearly bills still get a monthly reminder cadence until a
// dedicated schedule model lands.
export function getNextDueDate(dueDay: number, from: Date = new Date()): Date {
  const thisMonth = clampToMonth(from, dueDay);
  if (getDate(from) <= getDate(thisMonth)) return thisMonth;
  return clampToMonth(addMonths(from, 1), dueDay);
}

export function getBillPeriodKey(dueDay: number, from: Date = new Date()): string {
  return format(getNextDueDate(dueDay, from), 'yyyy-MM');
}

export async function listBills(
  db: SQLiteDatabase,
  profileId: number,
  includeArchived = false
): Promise<Bill[]> {
  if (includeArchived) {
    return db.getAllAsync<Bill>(
      'SELECT * FROM bills WHERE profile_id = ? ORDER BY due_day ASC, id ASC',
      [profileId]
    );
  }
  return db.getAllAsync<Bill>(
    'SELECT * FROM bills WHERE profile_id = ? AND archived = 0 ORDER BY due_day ASC, id ASC',
    [profileId]
  );
}

export async function getBill(
  db: SQLiteDatabase,
  profileId: number,
  id: number
): Promise<Bill | null> {
  return db.getFirstAsync<Bill>('SELECT * FROM bills WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function createBill(
  db: SQLiteDatabase,
  profileId: number,
  data: {
    name: string;
    amount: number;
    categoryId: number | null;
    accountId: number | null;
    dueDay: number;
    recurrence: BillRecurrence;
    reminderDaysBefore: number;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO bills (profile_id, name, amount, category_id, account_id, due_day, recurrence, reminder_days_before, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      profileId,
      data.name,
      data.amount,
      data.categoryId,
      data.accountId,
      data.dueDay,
      data.recurrence,
      data.reminderDaysBefore,
      now,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateBill(
  db: SQLiteDatabase,
  profileId: number,
  id: number,
  patch: Partial<
    Pick<
      Bill,
      | 'name'
      | 'amount'
      | 'category_id'
      | 'account_id'
      | 'due_day'
      | 'recurrence'
      | 'reminder_days_before'
    >
  >
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number | null);
  await db.runAsync(`UPDATE bills SET ${setClause} WHERE id = ? AND profile_id = ?`, [
    ...values,
    id,
    profileId,
  ]);
}

export async function archiveBill(db: SQLiteDatabase, profileId: number, id: number): Promise<void> {
  await db.runAsync('UPDATE bills SET archived = 1 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function unarchiveBill(db: SQLiteDatabase, profileId: number, id: number): Promise<void> {
  await db.runAsync('UPDATE bills SET archived = 0 WHERE id = ? AND profile_id = ?', [
    id,
    profileId,
  ]);
}

export async function listBillPayments(db: SQLiteDatabase, billId: number): Promise<BillPayment[]> {
  return db.getAllAsync<BillPayment>(
    'SELECT * FROM bill_payments WHERE bill_id = ? ORDER BY paid_at DESC, id DESC',
    [billId]
  );
}

export async function getBillPaymentForPeriod(
  db: SQLiteDatabase,
  billId: number,
  periodKey: string
): Promise<BillPayment | null> {
  return db.getFirstAsync<BillPayment>(
    'SELECT * FROM bill_payments WHERE bill_id = ? AND period_key = ?',
    [billId, periodKey]
  );
}

/** Inserts a bill_payments row and, when the bill is linked to a category, also logs the spend
 * against that category in the same transaction — so a paid bill counts against the budget like
 * any other expense, and the resulting transaction id is stored back on the payment row. */
export async function markBillPaid(
  db: SQLiteDatabase,
  profileId: number,
  billId: number,
  data: { periodKey: string; amountPaid: number; periodId: number | null }
): Promise<number> {
  const bill = await getBill(db, profileId, billId);
  if (!bill) throw new Error('Bill not found');

  const now = new Date().toISOString();
  let paymentId = 0;
  await db.withTransactionAsync(async () => {
    let transactionId: number | null = null;
    if (bill.category_id != null && data.periodId != null) {
      transactionId = await addCategoryTransaction(db, {
        periodId: data.periodId,
        categoryId: bill.category_id,
        amount: data.amountPaid,
        note: bill.name,
      });
    }
    const result = await db.runAsync(
      `INSERT INTO bill_payments (bill_id, period_key, amount_paid, transaction_id, paid_at)
       VALUES (?, ?, ?, ?, ?)`,
      [billId, data.periodKey, data.amountPaid, transactionId, now]
    );
    paymentId = result.lastInsertRowId;
  });
  return paymentId;
}

/** Active bills not yet paid for their current cycle, soonest due first. */
export async function listBillsDueSoon(
  db: SQLiteDatabase,
  profileId: number,
  limit = 3,
  from: Date = new Date()
): Promise<BillWithStatus[]> {
  const bills = await listBills(db, profileId, false);
  const withStatus: BillWithStatus[] = [];
  for (const bill of bills) {
    const nextDueDate = getNextDueDate(bill.due_day, from);
    const currentPeriodKey = format(nextDueDate, 'yyyy-MM');
    const payment = await getBillPaymentForPeriod(db, bill.id, currentPeriodKey);
    withStatus.push({
      ...bill,
      nextDueDate: nextDueDate.toISOString(),
      currentPeriodKey,
      paidForCurrentPeriod: !!payment,
    });
  }
  return withStatus
    .filter((b) => !b.paidForCurrentPeriod)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, limit);
}
