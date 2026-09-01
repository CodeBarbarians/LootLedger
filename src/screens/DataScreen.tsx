import { ScrollView, View } from 'react-native';
import { CTAButton } from '../components/app/CTAButton';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import { useDataStats } from '../hooks/useAggregates';
import { useBackupPreview, useExportBackup, useImportBackup } from '../hooks/useBackup';
import { useLatestPeriod } from '../hooks/usePeriods';
import { useSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors } from '../theme';
import { formatPeriodLabel } from '../utils/cycle';

type Props = TabScreenProps<'Data'>;

export function DataScreen({ navigation }: Props) {
  const { data: settings } = useSettings();
  const { data: stats } = useDataStats();
  const { data: preview } = useBackupPreview();
  const { data: latestPeriod } = useLatestPeriod();
  const exportBackup = useExportBackup();
  const importBackup = useImportBackup();
  const { show } = useToast();

  const lastBackupTxt = settings?.last_backup_at
    ? new Date(settings.last_backup_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'never';

  async function handleExport() {
    try {
      await exportBackup.mutateAsync();
      show('Backup file exported');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Export failed');
    }
  }

  async function handleImport() {
    try {
      const restored = await importBackup.mutateAsync();
      if (restored) show('Backup restored');
    } catch {
      show('That file is not a valid backup');
    }
  }

  return (
    <Screen>
      <SectionLabel number="04" label="DATA" title="Backup & restore" />
      <Text variant="label" className="leading-5 -mt-2 mb-1">
        Everything lives on this device. Export writes a single JSON file you can keep anywhere;
        importing it replaces the current data.
      </Text>

      <CTAButton label="↓ EXPORT BACKUP FILE" className="mt-4" loading={exportBackup.isPending} onPress={handleExport} />
      <CTAButton
        label="↑ IMPORT BACKUP FILE"
        variant="outline"
        className="mt-2.5"
        loading={importBackup.isPending}
        onPress={handleImport}
      />

      <View className="rounded-[20px] border border-border bg-card px-[18px] py-4 mt-4">
        <View className="flex-row justify-between items-baseline">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            LAST EXPORT
          </Text>
          <Text variant="mono" className="text-[11px] text-muted-foreground">
            {lastBackupTxt}
          </Text>
        </View>
        <View className="flex-row justify-between items-baseline mt-3">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            IN THIS FILE
          </Text>
          <Text variant="mono" className="text-[11px] text-muted-foreground">
            {stats ? `${stats.categoryCount} categories · ${stats.transactionCount} entries · ${stats.periodCount} months` : '—'}
          </Text>
        </View>
      </View>

      <Text variant="monoLabel" className="mt-6 mb-2.5 px-0.5">
        File preview
      </Text>
      <ScrollView
        horizontal
        className="rounded-2xl border border-border"
        style={{ backgroundColor: colors.backgroundDeep }}
        contentContainerStyle={{ padding: 14 }}
      >
        <Text
          style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, lineHeight: 17, color: colors.success }}
        >
          {preview ?? ''}
        </Text>
      </ScrollView>

      {latestPeriod ? (
        <CTAButton
          label={`ARCHIVE ${formatPeriodLabel(latestPeriod.cycle_start_date).toUpperCase()} & START NEXT`}
          variant="outline"
          className="mt-4"
          onPress={() => navigation.navigate('BudgetSetup', { mode: 'newMonth' })}
        />
      ) : null}
    </Screen>
  );
}
