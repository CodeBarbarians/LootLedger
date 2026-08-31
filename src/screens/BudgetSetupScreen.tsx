import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FieldInput } from '../components/FieldInput';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { Text } from '../components/Text';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import type { BudgetMode, Category } from '../db/types';
import { useAllocationsForPeriod } from '../hooks/useAllocations';
import { useCategories } from '../hooks/useCategories';
import { useCompleteOnboarding, useSettings } from '../hooks/useSettings';
import { useLatestPeriod, usePeriod, useSaveBudgetSetup, toPeriodDates } from '../hooks/usePeriods';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { formatAmount, formatPercent } from '../utils/currency';
import { DEFAULT_CATEGORY_SEED } from '../db/schema';

type Props = NativeStackScreenProps<RootStackParamList, 'BudgetSetup'>;

interface Row {
  categoryId: number;
  name: string;
  color: string;
  percent: string; // e.g. "55"
  amount: string; // e.g. "27500"
}

export function BudgetSetupScreen({ route, navigation }: Props) {
  const { mode, periodId } = route.params;
  const isOnboarding = mode === 'onboarding';

  const { data: settings } = useSettings();
  const { data: categories } = useCategories();
  const { data: existingPeriod } = usePeriod(periodId);
  const { data: existingAllocations } = useAllocationsForPeriod(periodId);
  const { data: latestPeriod } = useLatestPeriod();
  const { data: latestAllocations } = useAllocationsForPeriod(
    mode === 'newMonth' ? latestPeriod?.id : undefined
  );

  const completeOnboarding = useCompleteOnboarding();
  const saveBudgetSetup = useSaveBudgetSetup();

  const [currencyCode, setCurrencyCode] = useState('PKR');
  const [currencySymbol, setCurrencySymbol] = useState('₨');
  const [cycleStartDay, setCycleStartDay] = useState('1');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('percent');
  const [rows, setRows] = useState<Row[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const symbol = isOnboarding ? currencySymbol : settings?.currency_symbol ?? 'Rs';

  useEffect(() => {
    if (initialized || !categories) return;
    if (!isOnboarding && !settings) return;

    if (!isOnboarding) {
      setBudgetMode((existingPeriod?.budget_mode ?? settings!.budget_mode) as BudgetMode);
      setSalaryAmount(String(existingPeriod?.salary_amount ?? settings!.salary_amount ?? ''));
    }

    const sourceAllocations = mode === 'edit' ? existingAllocations : mode === 'newMonth' ? latestAllocations : null;
    if (mode === 'edit' && !existingAllocations) return;
    if (mode === 'newMonth' && latestPeriod && !latestAllocations) return;

    const nextRows: Row[] = categories.map((c: Category, idx: number) => {
      const existing = sourceAllocations?.find((a) => a.category_id === c.id);
      if (existing) {
        return {
          categoryId: c.id,
          name: c.name,
          color: c.color,
          percent: existing.percent != null ? String(Math.round(existing.percent * 1000) / 10) : '',
          amount: String(Math.round(existing.amount_allocated)),
        };
      }
      const seedPct = DEFAULT_CATEGORY_SEED[idx]?.percent ?? 0;
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        percent: isOnboarding ? String(Math.round(seedPct * 1000) / 10) : '',
        amount: '',
      };
    });

    setRows(nextRows);
    setInitialized(true);
  }, [categories, settings, existingPeriod, existingAllocations, latestAllocations, latestPeriod, initialized, isOnboarding, mode]);

  const salary = parseFloat(salaryAmount) || 0;

  const totals = useMemo(() => {
    if (budgetMode === 'percent') {
      const totalPercent = rows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0) / 100;
      return {
        totalPercent,
        remainingPercent: 1 - totalPercent,
        totalAmount: totalPercent * salary,
        remainingAmount: (1 - totalPercent) * salary,
        over: totalPercent > 1.0001,
      };
    }
    const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    return {
      totalPercent: salary > 0 ? totalAmount / salary : 0,
      remainingPercent: salary > 0 ? 1 - totalAmount / salary : 0,
      totalAmount,
      remainingAmount: salary - totalAmount,
      over: totalAmount > salary + 0.01,
    };
  }, [rows, budgetMode, salary]);

  function updateRow(categoryId: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.categoryId === categoryId ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setError(null);
    if (salary <= 0) {
      setError('Enter a monthly amount greater than 0.');
      return;
    }
    if (totals.over) {
      setError(budgetMode === 'percent' ? 'Allocations exceed 100%.' : 'Allocations exceed your monthly amount.');
      return;
    }

    setSaving(true);
    try {
      const cycleDay = isOnboarding ? parseInt(cycleStartDay, 10) || 1 : settings!.cycle_start_day;

      if (isOnboarding) {
        await completeOnboarding.mutateAsync({
          salary_amount: salary,
          budget_mode: budgetMode,
          currency_code: currencyCode,
          currency_symbol: currencySymbol,
          cycle_start_day: cycleDay,
        });
      }

      const dates = mode === 'edit' && existingPeriod
        ? {
            periodKey: existingPeriod.period_key,
            cycleStartDate: existingPeriod.cycle_start_date,
            cycleEndDate: existingPeriod.cycle_end_date,
          }
        : toPeriodDates(new Date(), cycleDay);

      const allocations = rows.map((r) => ({
        categoryId: r.categoryId,
        percent: budgetMode === 'percent' ? (parseFloat(r.percent) || 0) / 100 : null,
        amountAllocated:
          budgetMode === 'percent' ? ((parseFloat(r.percent) || 0) / 100) * salary : parseFloat(r.amount) || 0,
      }));

      await saveBudgetSetup.mutateAsync({
        periodKey: dates.periodKey,
        cycleStartDate: dates.cycleStartDate,
        cycleEndDate: dates.cycleEndDate,
        salaryAmount: salary,
        budgetMode,
        allocations,
        existingPeriodId: mode === 'edit' ? periodId : undefined,
      });

      if (mode === 'edit') {
        navigation.goBack();
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong saving your budget.');
    } finally {
      setSaving(false);
    }
  }

  const title = isOnboarding ? 'Set Up Your Budget' : mode === 'newMonth' ? 'Start New Month' : 'Edit Budget';
  const subtitle = isOnboarding
    ? 'Tell us your monthly amount and how you want it split'
    : 'Adjust your monthly amount and category allocations';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text variant="monoLabel" color={colors.accent}>
          Budget Setup
        </Text>
        <Text variant="display" style={styles.title}>
          {title}
        </Text>
        <Text variant="label" style={styles.subtitle}>
          {subtitle}
        </Text>

        {isOnboarding ? (
          <Card style={styles.section}>
            <SectionHeader number="01" title="Basics" subtitle="Currency and when your budget month starts" />
            <Text variant="label" style={styles.fieldLabel}>
              Currency
            </Text>
            <View style={styles.chipRow}>
              {CURRENCY_OPTIONS.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    setCurrencyCode(c.code);
                    setCurrencySymbol(c.symbol);
                  }}
                  style={[styles.chip, currencyCode === c.code && styles.chipActive]}
                >
                  <Text
                    variant="mono"
                    color={currencyCode === c.code ? colors.accentOn : colors.textSecondary}
                  >
                    {c.symbol} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <FieldInput
                label="Cycle Start Day"
                keyboardType="number-pad"
                placeholder="1"
                value={cycleStartDay}
                onChangeText={setCycleStartDay}
                hint="Day of the month your budget cycle resets (1 = calendar month)"
              />
            </View>
          </Card>
        ) : null}

        <Card style={styles.section}>
          <SectionHeader
            number={isOnboarding ? '02' : '01'}
            title="Monthly Amount"
            subtitle="How much you have to budget this cycle"
          />
          <FieldInput
            label="Total Monthly Amount"
            required
            keyboardType="decimal-pad"
            placeholder="0"
            prefix={symbol}
            value={salaryAmount}
            onChangeText={setSalaryAmount}
          />

          <View style={{ marginTop: spacing.lg }}>
            <Text variant="label" style={styles.fieldLabel}>
              Budget Mode
            </Text>
            <SegmentedControl
              options={[
                { value: 'percent', label: 'By Percentage' },
                { value: 'amount', label: 'By Amount' },
              ]}
              value={budgetMode}
              onChange={(v) => setBudgetMode(v as BudgetMode)}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionHeader
            number={isOnboarding ? '03' : '02'}
            title="Categories"
            subtitle={
              budgetMode === 'percent'
                ? 'Split 100% of your budget across categories'
                : `Split ${formatAmount(salary, symbol)} across categories`
            }
          />

          {rows.map((row) => (
            <View key={row.categoryId} style={styles.categoryRow}>
              <View style={styles.categoryLabelRow}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text variant="body" style={{ flex: 1 }}>
                  {row.name}
                </Text>
              </View>
              {budgetMode === 'percent' ? (
                <FieldInput
                  keyboardType="decimal-pad"
                  placeholder="0"
                  value={row.percent}
                  onChangeText={(v) => updateRow(row.categoryId, { percent: v })}
                  hint={`≈ ${formatAmount(((parseFloat(row.percent) || 0) / 100) * salary, symbol)}`}
                />
              ) : (
                <FieldInput
                  keyboardType="decimal-pad"
                  placeholder="0"
                  prefix={symbol}
                  value={row.amount}
                  onChangeText={(v) => updateRow(row.categoryId, { amount: v })}
                  hint={salary > 0 ? `≈ ${formatPercent((parseFloat(row.amount) || 0) / salary)}` : undefined}
                />
              )}
            </View>
          ))}

          <View style={[styles.summaryBar, totals.over && styles.summaryBarOver]}>
            <View style={{ flex: 1 }}>
              <Text variant="mono" color={totals.over ? colors.danger : colors.textSecondary}>
                {budgetMode === 'percent' ? formatPercent(totals.remainingPercent) : formatAmount(totals.remainingAmount, symbol)}{' '}
                {totals.over ? 'over-allocated' : 'unallocated'}
              </Text>
            </View>
          </View>
          {error ? (
            <Text variant="label" color={colors.danger} style={{ marginTop: spacing.md }}>
              {error}
            </Text>
          ) : null}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={{ flex: 1 }}
        />
        <Button
          label={isOnboarding ? 'Get Started' : 'Save Budget'}
          onPress={handleSave}
          loading={saving}
          style={{ flex: 2 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { marginTop: spacing.sm },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  fieldLabel: { marginBottom: spacing.sm, color: colors.textPrimary },
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
  categoryRow: { marginBottom: spacing.lg },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  summaryBar: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBarOver: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
