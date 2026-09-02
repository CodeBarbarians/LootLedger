import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  archiveBill,
  deleteBill,
  createBill,
  getBillPeriodKey,
  listBillPayments,
  listBills,
  listBillsDueSoon,
  markBillPaid,
  unarchiveBill,
  updateBill,
} from '../db/repositories/bills';
import type { Bill, BillRecurrence } from '../db/types';

export { getBillPeriodKey };

export function useBills(profileId: number | undefined, includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['bills', profileId, includeArchived],
    queryFn: () => listBills(db, profileId as number, includeArchived),
    enabled: profileId != null,
  });
}

export function useBillsDueSoon(profileId: number | undefined, limit = 3) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['billsDueSoon', profileId, limit],
    queryFn: () => listBillsDueSoon(db, profileId as number, limit),
    enabled: profileId != null,
  });
}

export function useBillPayments(billId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['billPayments', billId],
    queryFn: () => listBillPayments(db, billId as number),
    enabled: billId != null,
  });
}

export function useCreateBill(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      amount: number;
      categoryId: number | null;
      accountId: number | null;
      dueDay: number;
      recurrence: BillRecurrence;
      reminderDaysBefore: number;
    }) => createBill(db, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', profileId] });
      queryClient.invalidateQueries({ queryKey: ['billsDueSoon', profileId] });
    },
  });
}

export function useUpdateBill(profileId: number) {
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
          Bill,
          | 'name'
          | 'amount'
          | 'category_id'
          | 'account_id'
          | 'due_day'
          | 'recurrence'
          | 'reminder_days_before'
        >
      >;
    }) => updateBill(db, profileId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', profileId] });
      queryClient.invalidateQueries({ queryKey: ['billsDueSoon', profileId] });
    },
  });
}

export function useArchiveBill(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveBill(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', profileId] });
      queryClient.invalidateQueries({ queryKey: ['billsDueSoon', profileId] });
    },
  });
}

export function useUnarchiveBill(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveBill(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', profileId] });
      queryClient.invalidateQueries({ queryKey: ['billsDueSoon', profileId] });
    },
  });
}

export function useMarkBillPaid(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      billId,
      data,
    }: {
      billId: number;
      data: { periodKey: string; amountPaid: number; periodId: number | null };
    }) => markBillPaid(db, profileId, billId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bills', profileId] });
      queryClient.invalidateQueries({ queryKey: ['billsDueSoon', profileId] });
      queryClient.invalidateQueries({ queryKey: ['billPayments', variables.billId] });
      queryClient.invalidateQueries({ queryKey: ['categoriesProgress'] });
      queryClient.invalidateQueries({ queryKey: ['periodSummary'] });
    },
  });
}

export function useDeleteBill(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBill(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', profileId] });
    },
  });
}
