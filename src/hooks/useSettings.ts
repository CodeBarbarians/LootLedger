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

/**
 * Switches the theme with the repaint starting on this very frame.
 *
 * `useUpdateSettings` patches the cache optimistically too, but only from
 * `onMutate` — React Query gets there a promise tick later, which measured ~180ms
 * before the app even began re-rendering. The theme transition flips at the peak
 * of an animation and every one of those milliseconds is time it has to keep the
 * screen covered, so the cache is written synchronously here and the mutation is
 * left to handle persistence.
 */
export function useSetThemeMode() {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSettings();
  return (theme_mode: Settings['theme_mode']) => {
    queryClient.setQueryData<Settings>(['settings'], (current) =>
      current ? { ...current, theme_mode } : current
    );
    updateSettings.mutate({ theme_mode });
  };
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
