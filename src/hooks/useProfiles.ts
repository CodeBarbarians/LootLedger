import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  archiveProfile,
  createProfile,
  getProfile,
  listProfiles,
  unarchiveProfile,
  updateProfile,
} from '../db/repositories/profiles';
import type { BudgetMode, BudgetProfile } from '../db/types';
import { useSettings } from './useSettings';

export function useProfiles(includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['profiles', includeArchived],
    queryFn: () => listProfiles(db, includeArchived),
  });
}

export function useProfile(profileId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => getProfile(db, profileId as number),
    enabled: profileId != null,
  });
}

export function useCreateProfile() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      color: string;
      currencyCode: string;
      currencySymbol: string;
      cycleStartDay: number;
      salaryAmount: number;
      budgetMode: BudgetMode;
    }) => createProfile(db, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<
        Pick<
          BudgetProfile,
          | 'name'
          | 'color'
          | 'currency_code'
          | 'currency_symbol'
          | 'cycle_start_day'
          | 'salary_amount'
          | 'budget_mode'
          | 'onboarded'
          | 'sort_order'
        >
      >;
    }) => updateProfile(db, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useArchiveProfile() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveProfile(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUnarchiveProfile() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveProfile(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useActiveProfile() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const activeProfileId = settings?.active_profile_id ?? null;
  const profileQuery = useProfile(activeProfileId ?? undefined);

  return {
    ...profileQuery,
    isLoading: settingsLoading || (activeProfileId != null && profileQuery.isLoading),
    needsOnboarding: !!settings && activeProfileId == null,
  };
}
