import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  archiveDebt,
  deleteDebt,
  createDebt,
  listDebtPayments,
  listDebts,
  recordPayment,
  unarchiveDebt,
  updateDebt,
} from '../db/repositories/debts';
import type { Debt, DebtKind } from '../db/types';

export function useDebts(profileId: number | undefined, includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['debts', profileId, includeArchived],
    queryFn: () => listDebts(db, profileId as number, includeArchived),
    enabled: profileId != null,
  });
}

export function useDebtPayments(debtId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['debtPayments', debtId],
    queryFn: () => listDebtPayments(db, debtId as number),
    enabled: debtId != null,
  });
}

export function useCreateDebt(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      kind: DebtKind;
      principalBalance: number;
      interestRateApr: number;
      minimumPayment: number;
      accountId: number | null;
    }) => createDebt(db, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', profileId] });
    },
  });
}

export function useUpdateDebt(profileId: number) {
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
          Debt,
          'name' | 'kind' | 'principal_balance' | 'interest_rate_apr' | 'minimum_payment' | 'account_id'
        >
      >;
    }) => updateDebt(db, profileId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', profileId] });
    },
  });
}

export function useArchiveDebt(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveDebt(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', profileId] });
    },
  });
}

export function useUnarchiveDebt(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveDebt(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', profileId] });
    },
  });
}

export function useRecordPayment(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      debtId,
      data,
    }: {
      debtId: number;
      data: { amount: number; principalPortion: number; interestPortion: number; note: string | null };
    }) => recordPayment(db, profileId, debtId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debts', profileId] });
      queryClient.invalidateQueries({ queryKey: ['debtPayments', variables.debtId] });
    },
  });
}

export function useDeleteDebt(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDebt(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', profileId] });
    },
  });
}
