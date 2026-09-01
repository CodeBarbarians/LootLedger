import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createSubcategory,
  deleteSubcategory,
  listSubcategoriesForCategory,
  markSubcategoryPaid,
  paySubcategory,
  unpaySubcategory,
} from '../db/repositories/subcategories';

export function useSubcategories(periodId: number | undefined, categoryId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['subcategories', periodId, categoryId],
    queryFn: () => listSubcategoriesForCategory(db, periodId as number, categoryId as number),
    enabled: periodId != null && categoryId != null,
  });
}

function useInvalidateAfterSpend(periodId: number | undefined) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['categoriesProgress', periodId] });
    queryClient.invalidateQueries({ queryKey: ['periodSummary', periodId] });
  };
}

export function useCreateSubcategory(periodId: number | undefined) {
  const db = useSQLiteContext();
  const invalidate = useInvalidateAfterSpend(periodId);
  return useMutation({
    mutationFn: (data: { categoryId: number; name: string; amountBudgeted: number }) =>
      createSubcategory(db, { periodId: periodId as number, ...data }),
    onSuccess: invalidate,
  });
}

export function useMarkSubcategoryPaid(periodId: number | undefined) {
  const db = useSQLiteContext();
  const invalidate = useInvalidateAfterSpend(periodId);
  return useMutation({
    mutationFn: (subcategoryId: number) => markSubcategoryPaid(db, subcategoryId),
    onSuccess: invalidate,
  });
}

export function useUnpaySubcategory(periodId: number | undefined) {
  const db = useSQLiteContext();
  const invalidate = useInvalidateAfterSpend(periodId);
  return useMutation({
    mutationFn: (subcategoryId: number) => unpaySubcategory(db, subcategoryId),
    onSuccess: invalidate,
  });
}

export function usePaySubcategoryPartial(periodId: number | undefined) {
  const db = useSQLiteContext();
  const invalidate = useInvalidateAfterSpend(periodId);
  return useMutation({
    mutationFn: (data: { subcategoryId: number; amount: number; note?: string }) =>
      paySubcategory(db, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSubcategory(periodId: number | undefined) {
  const db = useSQLiteContext();
  const invalidate = useInvalidateAfterSpend(periodId);
  return useMutation({
    mutationFn: (id: number) => deleteSubcategory(db, id),
    onSuccess: invalidate,
  });
}
