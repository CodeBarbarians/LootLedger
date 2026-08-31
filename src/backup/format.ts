export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  settings: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  budget_periods: Record<string, unknown>[];
  allocations: Record<string, unknown>[];
  subcategories: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
}
