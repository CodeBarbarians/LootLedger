import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  archiveAccount,
  createAccount,
  getNetWorth,
  getNetWorthTrend,
  listAccounts,
  unarchiveAccount,
  updateAccount,
  updateAccountBalance,
} from '../db/repositories/accounts';
import type { Account, AccountType } from '../db/types';

export function useAccounts(profileId: number | undefined, includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['accounts', profileId, includeArchived],
    queryFn: () => listAccounts(db, profileId as number, includeArchived),
    enabled: profileId != null,
  });
}

export function useCreateAccount(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: AccountType; color: string; isLiability: boolean; currentBalance: number }) =>
      createAccount(db, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorth', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorthTrend', profileId] });
    },
  });
}

export function useUpdateAccount(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<Pick<Account, 'name' | 'type' | 'color' | 'is_liability' | 'sort_order'>>;
    }) => updateAccount(db, profileId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorth', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorthTrend', profileId] });
    },
  });
}

export function useUpdateAccountBalance(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, balance }: { id: number; balance: number }) =>
      updateAccountBalance(db, profileId, id, balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorth', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorthTrend', profileId] });
    },
  });
}

export function useArchiveAccount(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveAccount(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorth', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorthTrend', profileId] });
    },
  });
}

export function useUnarchiveAccount(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveAccount(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorth', profileId] });
      queryClient.invalidateQueries({ queryKey: ['netWorthTrend', profileId] });
    },
  });
}

export function useNetWorth(profileId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['netWorth', profileId],
    queryFn: () => getNetWorth(db, profileId as number),
    enabled: profileId != null,
  });
}

export function useNetWorthTrend(profileId: number | undefined, months = 6) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['netWorthTrend', profileId, months],
    queryFn: () => getNetWorthTrend(db, profileId as number, months),
    enabled: profileId != null,
  });
}
