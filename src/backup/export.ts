import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_SCHEMA_VERSION, type BackupPayload } from './format';

export async function buildBackupPayload(db: SQLiteDatabase): Promise<BackupPayload> {
  const [settings, categories, budget_periods, allocations, subcategories, transactions] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM settings'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM categories'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM budget_periods'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM allocations'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM subcategories'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM transactions'),
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    budget_periods,
    allocations,
    subcategories,
    transactions,
  };
}

export async function exportBackup(db: SQLiteDatabase): Promise<string> {
  const payload = await buildBackupPayload(db);
  const fileName = `lootledger-backup-${payload.exportedAt.slice(0, 10)}.json`;

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export LootLedger Backup',
      UTI: 'public.json',
    });
  }

  return file.uri;
}
