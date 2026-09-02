import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { BackupPayload } from './format';

export async function pickBackupFile(): Promise<BackupPayload | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (picked.canceled || !picked.assets[0]) return null;

  const text = await new File(picked.assets[0].uri).text();
  const data = JSON.parse(text);

  if (typeof data.schemaVersion !== 'number' || !Array.isArray(data.categories)) {
    throw new Error('This file is not a valid LootLedger backup.');
  }

  return data as BackupPayload;
}

const TABLE_ORDER: (keyof BackupPayload)[] = [
  'budget_profiles',
  'settings',
  'categories',
  'budget_periods',
  'accounts',
  'debts',
  'bills',
  'goals',
  'allocations',
  'subcategories',
  'transactions',
  'account_balance_snapshots',
  'debt_payments',
  'bill_payments',
  'goal_contributions',
];

async function insertRows(db: SQLiteDatabase, table: string, rows: Record<string, unknown>[]) {
  for (const row of rows) {
    const keys = Object.keys(row);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => row[k] as string | number | null);
    await db.runAsync(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
  }
}

/** Wipes all existing data and replaces it with the contents of a backup file. */
export async function restoreBackup(db: SQLiteDatabase, payload: BackupPayload): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of [...TABLE_ORDER].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of TABLE_ORDER) {
      await insertRows(db, table, (payload[table] as Record<string, unknown>[] | undefined) ?? []);
    }
  });
}
