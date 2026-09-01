import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  archiveCategory,
  createCategory,
  listCategories,
  unarchiveCategory,
  updateCategory,
} from '../db/repositories/categories';
import type { Category, CategoryKind } from '../db/types';

export function useCategories(includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['categories', includeArchived],
    queryFn: () => listCategories(db, includeArchived),
  });
}

export function useCreateCategory() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string; kind: CategoryKind }) => createCategory(db, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Pick<Category, 'name' | 'color' | 'sort_order' | 'kind'>> }) =>
      updateCategory(db, id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useArchiveCategory() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveCategory(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUnarchiveCategory() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveCategory(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}
