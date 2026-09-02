export type BudgetMode = 'percent' | 'amount';
export type SubcategoryStatus = 'unpaid' | 'partial' | 'paid';
export type CategoryKind = 'expense' | 'debt' | 'saving';
export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'loan'
  | 'other';
export type DebtKind =
  | 'credit_card'
  | 'personal_loan'
  | 'student_loan'
  | 'auto_loan'
  | 'medical'
  | 'other';
export type BillRecurrence = 'monthly' | 'weekly' | 'yearly';

export interface Settings {
  id: number;
  active_profile_id: number | null;
  last_backup_at: string | null;
  theme_mode: 'dark' | 'light';
  biometric_lock_enabled: number;
}

export interface BudgetProfile {
  id: number;
  name: string;
  color: string;
  currency_code: string;
  currency_symbol: string;
  cycle_start_day: number;
  salary_amount: number;
  budget_mode: BudgetMode;
  onboarded: number; // 0 | 1
  archived: number; // 0 | 1
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: number;
  profile_id: number;
  name: string;
  color: string;
  kind: CategoryKind;
  sort_order: number;
  is_default: number; // 0 | 1
  archived: number; // 0 | 1
}

export interface BudgetPeriod {
  id: number;
  profile_id: number;
  period_key: string; // '2026-08'
  cycle_start_date: string; // ISO date
  cycle_end_date: string; // ISO date
  salary_amount: number;
  budget_mode: BudgetMode;
  created_at: string;
  closed: number; // 0 | 1
}

export interface Allocation {
  id: number;
  period_id: number;
  category_id: number;
  percent: number | null;
  amount_allocated: number;
}

export interface Subcategory {
  id: number;
  period_id: number;
  category_id: number;
  name: string;
  amount_budgeted: number;
  amount_paid: number;
  status: SubcategoryStatus;
  created_at: string;
  paid_at: string | null;
}

export interface Transaction {
  id: number;
  period_id: number;
  category_id: number;
  subcategory_id: number | null;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface Account {
  id: number;
  profile_id: number;
  name: string;
  type: AccountType;
  color: string;
  is_liability: number; // 0 | 1
  current_balance: number;
  archived: number; // 0 | 1
  sort_order: number;
  created_at: string;
}

export interface AccountBalanceSnapshot {
  id: number;
  account_id: number;
  balance: number;
  recorded_at: string;
}

export interface Debt {
  id: number;
  profile_id: number;
  name: string;
  kind: DebtKind;
  principal_balance: number;
  interest_rate_apr: number;
  minimum_payment: number;
  account_id: number | null;
  archived: number; // 0 | 1
  created_at: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: number;
  principal_portion: number;
  interest_portion: number;
  note: string | null;
  paid_at: string;
}

export interface Bill {
  id: number;
  profile_id: number;
  name: string;
  amount: number;
  category_id: number | null;
  account_id: number | null;
  due_day: number;
  recurrence: BillRecurrence;
  reminder_days_before: number;
  archived: number; // 0 | 1
  created_at: string;
}

export interface BillPayment {
  id: number;
  bill_id: number;
  period_key: string;
  amount_paid: number;
  transaction_id: number | null;
  paid_at: string;
}

export interface Goal {
  id: number;
  profile_id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  color: string;
  archived: number; // 0 | 1
  created_at: string;
}

export interface GoalContribution {
  id: number;
  goal_id: number;
  amount: number;
  note: string | null;
  created_at: string;
}

// Derived / joined shapes used by the UI layer

export interface CategoryWithProgress extends Category {
  allocated: number;
  spent: number;
  remaining: number;
  percent: number | null;
}

export interface SubcategoryWithPending extends Subcategory {
  pending: number;
}

export interface BillWithStatus extends Bill {
  nextDueDate: string; // ISO date
  currentPeriodKey: string; // 'yyyy-MM' the next due date falls in
  paidForCurrentPeriod: boolean;
}

export interface GoalWithProgress extends Goal {
  contributed: number;
}

export interface PeriodSummary {
  period: BudgetPeriod;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number; // "safe to spend" — allocated minus spent, can go negative
  overspend: number; // sum of max(0, spent-allocated) per category
  saved: number; // salary - totalSpent
  toSavings: number; // sum of allocated amount across 'saving' kind categories
  overCount: number; // number of categories spent past their allocation
}

export interface NetWorth {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface NetWorthMonthPoint {
  monthKey: string; // '2026-09'
  netWorth: number;
}
