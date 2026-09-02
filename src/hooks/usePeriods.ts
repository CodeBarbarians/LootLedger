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

export function useCurrentPeriod(profileId: number | undefined, cycleStartDay: number) {
  const db = useSQLiteContext();
  const bounds = getCycleBoundsForDate(new Date(), cycleStartDay);

  const query = useQuery({
    queryKey: ['period', profileId, bounds.periodKey],
    queryFn: () => getPeriodByKey(db, profileId as number, bounds.periodKey),
    enabled: profileId != null,
  });

  return { ...query, bounds };
}

export function useLatestPeriod(profileId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['latestPeriod', profileId],
    queryFn: () => getLatestPeriod(db, profileId as number),
    enabled: profileId != null,
  });
}

export function usePeriod(profileId: number | undefined, periodId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['periodById', profileId, periodId],
    queryFn: () => getPeriod(db, profileId as number, periodId as number),
    enabled: profileId != null && periodId != null,
  });
}

export function usePeriods(profileId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['periods', profileId],
    queryFn: () => listPeriods(db, profileId as number),
    enabled: profileId != null,
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

export function useSaveBudgetSetup(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveBudgetSetupInput) => {
      let periodId = input.existingPeriodId;
      if (periodId != null) {
        await updatePeriod(db, profileId, periodId, {
          salary_amount: input.salaryAmount,
          budget_mode: input.budgetMode,
        });
      } else {
        periodId = await createPeriod(db, profileId, {
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
