export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salary_amount REAL NOT NULL DEFAULT 0,
  budget_mode TEXT NOT NULL DEFAULT 'percent',
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs',
  cycle_start_day INTEGER NOT NULL DEFAULT 1,
  onboarded INTEGER NOT NULL DEFAULT 0,
  last_backup_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF5A1F',
  kind TEXT NOT NULL DEFAULT 'expense',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_key TEXT NOT NULL UNIQUE,
  cycle_start_date TEXT NOT NULL,
  cycle_end_date TEXT NOT NULL,
  salary_amount REAL NOT NULL,
  budget_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_id INTEGER NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  percent REAL,
  amount_allocated REAL NOT NULL DEFAULT 0,
  UNIQUE(period_id, category_id)
);

CREATE TABLE IF NOT EXISTS subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_id INTEGER NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_budgeted REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_id INTEGER NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_period ON allocations(period_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_period ON subcategories(period_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(period_id, category_id);
`;

import { CATEGORY_PALETTE } from '../theme/colors';

export interface DefaultCategorySeed {
  name: string;
  color: string;
  kind: 'expense' | 'debt' | 'saving';
  percent: number;
}

// Default starter budget, expressed as percentages of the monthly salary.
export const DEFAULT_CATEGORY_SEED: DefaultCategorySeed[] = [
  { name: 'Grocery, rent & expenses', color: CATEGORY_PALETTE[0], kind: 'expense', percent: 0.55 },
  { name: 'Guilt-free spending', color: CATEGORY_PALETTE[1], kind: 'expense', percent: 0.05 },
  { name: 'Debt', color: CATEGORY_PALETTE[2], kind: 'debt', percent: 0.1 },
  { name: 'Savings — short term goal', color: CATEGORY_PALETTE[3], kind: 'saving', percent: 0.15 },
  { name: 'Long term goal', color: CATEGORY_PALETTE[4], kind: 'saving', percent: 0.15 },
];
