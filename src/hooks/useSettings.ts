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
