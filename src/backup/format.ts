export const BACKUP_SCHEMA_VERSION = 2;

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  budget_profiles: Record<string, unknown>[];
  settings: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  budget_periods: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  debts: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  allocations: Record<string, unknown>[];
  subcategories: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  account_balance_snapshots: Record<string, unknown>[];
  debt_payments: Record<string, unknown>[];
  bill_payments: Record<string, unknown>[];
  goal_contributions: Record<string, unknown>[];
}
