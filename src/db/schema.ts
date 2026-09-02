export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS budget_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF5A1F',
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs',
  cycle_start_day INTEGER NOT NULL DEFAULT 1,
  salary_amount REAL NOT NULL DEFAULT 0,
  budget_mode TEXT NOT NULL DEFAULT 'percent',
  onboarded INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_profile_id INTEGER REFERENCES budget_profiles(id),
  last_backup_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF5A1F',
  kind TEXT NOT NULL DEFAULT 'expense',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  cycle_start_date TEXT NOT NULL,
  cycle_end_date TEXT NOT NULL,
  salary_amount REAL NOT NULL,
  budget_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(profile_id, period_key)
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

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking',
  color TEXT NOT NULL DEFAULT '#FF5A1F',
  is_liability INTEGER NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_balance_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  balance REAL NOT NULL,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'credit_card',
  principal_balance REAL NOT NULL DEFAULT 0,
  interest_rate_apr REAL NOT NULL DEFAULT 0,
  minimum_payment REAL NOT NULL DEFAULT 0,
  account_id INTEGER REFERENCES accounts(id),
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  principal_portion REAL NOT NULL DEFAULT 0,
  interest_portion REAL NOT NULL DEFAULT 0,
  note TEXT,
  paid_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES budget_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category_id INTEGER REFERENCES categories(id),
  account_id INTEGER REFERENCES accounts(id),
  due_day INTEGER NOT NULL DEFAULT 1,
  recurrence TEXT NOT NULL DEFAULT 'monthly',
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  amount_paid REAL NOT NULL,
  transaction_id INTEGER REFERENCES transactions(id),
  paid_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_period ON allocations(period_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_period ON subcategories(period_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(period_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_profile ON categories(profile_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_profile ON budget_periods(profile_id);
CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_account ON account_balance_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_debts_profile ON debts(profile_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_bills_profile ON bills(profile_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON bill_payments(bill_id);
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
