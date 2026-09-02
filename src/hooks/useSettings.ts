import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getSettings, setActiveProfileId, updateSettings } from '../db/repositories/settings';
import type { Settings } from '../db/types';

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
    // Patched into the cache up front rather than after the write: the theme
    // transition flips themes at the peak of its animation and starts uncovering
    // the result ~150ms later, which is not enough time to wait on a SQLite
    // round-trip, an invalidate and a refetch before the repaint.
    onMutate: (patch) => {
      const previous = queryClient.getQueryData<Settings>(['settings']);
      queryClient.setQueryData<Settings>(['settings'], (current) =>
        current ? { ...current, ...patch } : current
      );
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings'], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useSetActiveProfile() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: number) => setActiveProfileId(db, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
