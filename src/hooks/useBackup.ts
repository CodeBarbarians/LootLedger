import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { buildBackupPayload, exportBackup } from '../backup/export';
import { pickBackupFile, restoreBackup } from '../backup/import';
import { updateSettings } from '../db/repositories/settings';

export function useBackupPreview() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['backupPreview'],
    queryFn: async () => {
      const payload = await buildBackupPayload(db);
      const lines = JSON.stringify(payload, null, 2).split('\n');
      return lines.slice(0, 14).join('\n') + (lines.length > 14 ? '\n  …' : '');
    },
  });
}

export function useExportBackup() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const uri = await exportBackup(db);
      await updateSettings(db, { last_backup_at: new Date().toISOString() });
      return uri;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useImportBackup() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const payload = await pickBackupFile();
      if (!payload) return false;
      await restoreBackup(db, payload);
      return true;
    },
    onSuccess: (restored) => {
      if (restored) queryClient.invalidateQueries();
    },
  });
}
