export type BudgetMode = 'percent' | 'amount';
export type SubcategoryStatus = 'unpaid' | 'partial' | 'paid';
export type CategoryKind = 'expense' | 'debt' | 'saving';

export interface Settings {
  id: number;
  salary_amount: number;
  budget_mode: BudgetMode;
  currency_code: string;
  currency_symbol: string;
  cycle_start_day: number;
  onboarded: number; // 0 | 1
  last_backup_at: string | null;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  kind: CategoryKind;
  sort_order: number;
  is_default: number; // 0 | 1
  archived: number; // 0 | 1
}

export interface BudgetPeriod {
  id: number;
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
