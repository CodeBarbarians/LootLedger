import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FieldInput } from '../components/FieldInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { Text } from '../components/Text';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import { exportBackup } from '../backup/export';
import { pickBackupFile, restoreBackup } from '../backup/import';
import { useArchiveCategory, useCategories, useCreateCategory, useUnarchiveCategory } from '../hooks/useCategories';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { colors, spacing } from '../theme';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORY_COLOR_CHOICES = ['#FF5A1F', '#F2C14E', '#FF6B5C', '#5CD98C', '#4FB6E0'];

export function SettingsScreen() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: categories } = useCategories(true);
  const createCategory = useCreateCategory();
  const archiveCategory = useArchiveCategory();
  const unarchiveCategory = useUnarchiveCategory();

  const [cycleStartDay, setCycleStartDay] = useState(String(settings?.cycle_start_day ?? 1));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSaveCycleDay() {
    const day = Math.min(28, Math.max(1, parseInt(cycleStartDay, 10) || 1));
    await updateSettings.mutateAsync({ cycle_start_day: day });
    setCycleStartDay(String(day));
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const color = CATEGORY_COLOR_CHOICES[(categories?.length ?? 0) % CATEGORY_COLOR_CHOICES.length];
    await createCategory.mutateAsync({ name: newCategoryName.trim(), color });
    setNewCategoryName('');
  }

  async function handleExport() {
    setBusy(true);
    try {
      await exportBackup(db);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    try {
      const payload = await pickBackupFile();
      if (!payload) return;

      Alert.alert(
        'Restore Backup',
        'This will replace all current data with the contents of this backup. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setBusy(true);
              try {
                await restoreBackup(db, payload);
                await queryClient.invalidateQueries();
                Alert.alert('Restored', 'Your backup has been restored.');
              } catch (e) {
                Alert.alert('Restore failed', e instanceof Error ? e.message : 'Something went wrong.');
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  return (
    <ScreenContainer>
      <Text variant="monoLabel" color={colors.accent}>
        Preferences
      </Text>
      <Text variant="display" style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
        Settings
      </Text>

      <Card style={styles.section}>
        <SectionHeader number="01" title="Currency" subtitle="Used across the whole app" />
        <View style={styles.chipRow}>
          {CURRENCY_OPTIONS.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => updateSettings.mutate({ currency_code: c.code, currency_symbol: c.symbol })}
              style={[styles.chip, settings?.currency_code === c.code && styles.chipActive]}
            >
              <Text variant="mono" color={settings?.currency_code === c.code ? colors.accentOn : colors.textSecondary}>
                {c.symbol} {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionHeader number="02" title="Cycle Start Day" subtitle="Which day of the month your budget resets" />
        <FieldInput
          keyboardType="number-pad"
          placeholder="1"
          value={cycleStartDay}
          onChangeText={setCycleStartDay}
          onBlur={handleSaveCycleDay}
        />
      </Card>

      <Card style={styles.section}>
        <SectionHeader number="03" title="Categories" subtitle="Manage your budget buckets" />
        <View style={{ marginBottom: spacing.md }}>
          <FieldInput
            placeholder="New category name"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
        </View>
        <Button label="Add Category" variant="secondary" onPress={handleAddCategory} />

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {(categories ?? []).map((c) => (
            <View key={c.id} style={styles.categoryRow}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text variant="body" style={{ flex: 1, opacity: c.archived ? 0.5 : 1 }}>
                {c.name}
              </Text>
              <Pressable
                onPress={() => (c.archived ? unarchiveCategory.mutate(c.id) : archiveCategory.mutate(c.id))}
              >
                <Text variant="label" color={c.archived ? colors.success : colors.danger}>
                  {c.archived ? 'Unarchive' : 'Archive'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionHeader number="04" title="Backup & Restore" subtitle="Export or import your data as a file" />
        <Button label="Export Backup" onPress={handleExport} loading={busy} />
        <Button label="Import Backup" variant="secondary" onPress={handleImport} style={{ marginTop: spacing.md }} />
      </Card>

      <Card style={styles.section}>
        <SectionHeader number="05" title="About" />
        <Text variant="label" color={colors.textMuted}>
          LootLedger — a simple monthly budget tracker.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.cardInset,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
