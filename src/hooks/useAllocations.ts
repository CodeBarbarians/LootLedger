import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { listAllocationsForPeriod } from '../db/repositories/allocations';

export function useAllocationsForPeriod(periodId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['allocations', periodId],
    queryFn: () => listAllocationsForPeriod(db, periodId as number),
    enabled: periodId != null,
  });
}
