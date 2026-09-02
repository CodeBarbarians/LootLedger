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

export function usePeriodSummary(profileId: number | undefined, periodId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['periodSummary', profileId, periodId],
    queryFn: () => getPeriodSummary(db, profileId as number, periodId as number),
    enabled: profileId != null && periodId != null,
  });
}

export function useHistoryTotals(profileId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['historyTotals', profileId],
    queryFn: () => getHistoryTotals(db, profileId as number),
    enabled: profileId != null,
  });
}

export function useDataStats() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['dataStats'],
    queryFn: () => getDataStats(db),
  });
}
