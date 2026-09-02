import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { resetToDefaultBudget } from '../db/repositories/reset';

export function useResetToDefaultBudget(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetToDefaultBudget(db, profileId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
