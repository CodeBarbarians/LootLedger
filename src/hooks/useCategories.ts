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

export function useCategories(profileId: number | undefined, includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['categories', profileId, includeArchived],
    queryFn: () => listCategories(db, profileId as number, includeArchived),
    enabled: profileId != null,
  });
}

export function useCreateCategory(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string; kind: CategoryKind }) =>
      createCategory(db, profileId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', profileId] }),
  });
}

export function useUpdateCategory(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Pick<Category, 'name' | 'color' | 'sort_order' | 'kind'>> }) =>
      updateCategory(db, profileId, id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', profileId] }),
  });
}

export function useArchiveCategory(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveCategory(db, profileId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', profileId] }),
  });
}

export function useUnarchiveCategory(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveCategory(db, profileId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', profileId] }),
  });
}
