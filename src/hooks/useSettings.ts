import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { completeOnboarding, getSettings, updateSettings } from '../db/repositories/settings';
import type { BudgetMode, Settings } from '../db/types';

export function useSettings() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(db),
  });
}

export function useUpdateSettings() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Settings, 'id'>>) => updateSettings(db, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useCompleteOnboarding() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      salary_amount: number;
      budget_mode: BudgetMode;
      currency_code: string;
      currency_symbol: string;
      cycle_start_day: number;
    }) => completeOnboarding(db, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
