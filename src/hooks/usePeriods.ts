import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { replaceAllocationsForPeriod, type AllocationInput } from '../db/repositories/allocations';
import {
  createPeriod,
  getLatestPeriod,
  getPeriod,
  getPeriodByKey,
  listPeriods,
  updatePeriod,
} from '../db/repositories/periods';
import type { BudgetMode } from '../db/types';
import { getCycleBoundsForDate, toIsoDate } from '../utils/cycle';
import { useSettings } from './useSettings';

export function useCurrentPeriod() {
  const db = useSQLiteContext();
  const { data: settings } = useSettings();
  const cycleStartDay = settings?.cycle_start_day ?? 1;
  const bounds = getCycleBoundsForDate(new Date(), cycleStartDay);

  const query = useQuery({
    queryKey: ['period', bounds.periodKey],
    queryFn: () => getPeriodByKey(db, bounds.periodKey),
    enabled: !!settings,
  });

  return { ...query, bounds };
}

export function useLatestPeriod() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['latestPeriod'],
    queryFn: () => getLatestPeriod(db),
  });
}

export function usePeriod(periodId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['periodById', periodId],
    queryFn: () => getPeriod(db, periodId as number),
    enabled: periodId != null,
  });
}

export function usePeriods() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['periods'],
    queryFn: () => listPeriods(db),
  });
}

export interface SaveBudgetSetupInput {
  periodKey: string;
  cycleStartDate: string;
  cycleEndDate: string;
  salaryAmount: number;
  budgetMode: BudgetMode;
  allocations: AllocationInput[];
  existingPeriodId?: number;
}

export function useSaveBudgetSetup() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveBudgetSetupInput) => {
      let periodId = input.existingPeriodId;
      if (periodId != null) {
        await updatePeriod(db, periodId, {
          salary_amount: input.salaryAmount,
          budget_mode: input.budgetMode,
        });
      } else {
        periodId = await createPeriod(db, {
          periodKey: input.periodKey,
          cycleStartDate: input.cycleStartDate,
          cycleEndDate: input.cycleEndDate,
          salaryAmount: input.salaryAmount,
          budgetMode: input.budgetMode,
        });
      }
      await replaceAllocationsForPeriod(db, periodId, input.allocations);
      return periodId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period'] });
      queryClient.invalidateQueries({ queryKey: ['periodById'] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['latestPeriod'] });
      queryClient.invalidateQueries({ queryKey: ['categoriesProgress'] });
      queryClient.invalidateQueries({ queryKey: ['periodSummary'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
  });
}

export function toPeriodDates(date: Date, cycleStartDay: number) {
  const bounds = getCycleBoundsForDate(date, cycleStartDay);
  return {
    periodKey: bounds.periodKey,
    cycleStartDate: toIsoDate(bounds.start),
    cycleEndDate: toIsoDate(bounds.end),
  };
}
