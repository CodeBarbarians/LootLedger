import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  addCategoryTransaction,
  deleteTransaction,
  listTransactionsForCategory,
} from '../db/repositories/transactions';

export function useTransactions(periodId: number | undefined, categoryId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['transactions', periodId, categoryId],
    queryFn: () => listTransactionsForCategory(db, periodId as number, categoryId as number),
    enabled: periodId != null && categoryId != null,
  });
}

export function useAddTransaction(periodId: number | undefined) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { categoryId: number; amount: number; note?: string }) =>
      addCategoryTransaction(db, { periodId: periodId as number, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['categoriesProgress', periodId] });
      queryClient.invalidateQueries({ queryKey: ['periodSummary', periodId] });
    },
  });
}

export function useDeleteTransaction(periodId: number | undefined) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTransaction(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['categoriesProgress', periodId] });
      queryClient.invalidateQueries({ queryKey: ['periodSummary', periodId] });
    },
  });
}
