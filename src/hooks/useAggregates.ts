import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getCategoriesWithProgress, getDataStats, getHistoryTotals, getPeriodSummary } from '../db/repositories/aggregates';

export function useCategoriesWithProgress(periodId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['categoriesProgress', periodId],
    queryFn: () => getCategoriesWithProgress(db, periodId as number),
    enabled: periodId != null,
  });
}

export function usePeriodSummary(periodId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['periodSummary', periodId],
    queryFn: () => getPeriodSummary(db, periodId as number),
    enabled: periodId != null,
  });
}

export function useHistoryTotals() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['historyTotals'],
    queryFn: () => getHistoryTotals(db),
  });
}

export function useDataStats() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['dataStats'],
    queryFn: () => getDataStats(db),
  });
}
