import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Bar, SegmentedBar } from '../components/app/Bar';
import { CTAButton } from '../components/app/CTAButton';
import { CategoryFormSheet } from '../components/app/CategoryFormSheet';
import { DashedButton } from '../components/app/DashedButton';
import { Pill } from '../components/app/Pill';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import type { AllocationInput } from '../db/repositories/allocations';
import { replaceAllocationsForPeriod } from '../db/repositories/allocations';
import { createCategory as createCategoryRow } from '../db/repositories/categories';
import { createPeriod as createPeriodRow } from '../db/repositories/periods';
import { DEFAULT_CATEGORY_SEED } from '../db/schema';
import type { BudgetMode, Category, CategoryKind } from '../db/types';
import { useAllocationsForPeriod } from '../hooks/useAllocations';
import { useArchiveCategory, useCategories, useCreateCategory } from '../hooks/useCategories';
import { useLatestPeriod, usePeriod, useSaveBudgetSetup, toPeriodDates } from '../hooks/usePeriods';
import { useActiveProfile, useCreateProfile } from '../hooks/useProfiles';
import { useSetActiveProfile } from '../hooks/useSettings';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors } from '../theme';
import { formatAmount, formatPercent } from '../utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'BudgetSetup'>;

interface Row {
  categoryId: number;
  name: string;
  color: string;
  kind: CategoryKind;
  percent: string;
  amount: string;
}

export function BudgetSetupScreen({ route, navigation }: Props) {
  const { mode, periodId } = route.params;
  const isOnboarding = mode === 'onboarding';
  const isCreatingProfile = mode === 'onboarding' || mode === 'newProfile';
  const { show } = useToast();
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  const { data: activeProfile } = useActiveProfile();
  const profileIdForQueries = isCreatingProfile ? undefined : activeProfile?.id;

  const { data: categories } = useCategories(profileIdForQueries);
  const { data: existingPeriod } = usePeriod(profileIdForQueries, periodId);
  const { data: existingAllocations } = useAllocationsForPeriod(periodId);
  const { data: latestPeriod } = useLatestPeriod(profileIdForQueries);
  const { data: latestAllocations } = useAllocationsForPeriod(
    mode === 'newMonth' ? latestPeriod?.id : undefined
  );

  const createProfile = useCreateProfile();
  const setActiveProfile = useSetActiveProfile();
  const saveBudgetSetup = useSaveBudgetSetup(activeProfile?.id as number);
  const createCategory = useCreateCategory(activeProfile?.id as number);
  const archiveCategory = useArchiveCategory(activeProfile?.id as number);

  const [profileName, setProfileName] = useState(isOnboarding ? 'Personal' : '');
  const [currencyCode, setCurrencyCode] = useState('PKR');
  const [currencySymbol, setCurrencySymbol] = useState('₨');
  const [cycleStartDay, setCycleStartDay] = useState('1');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('percent');
  const [rows, setRows] = useState<Row[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const symbol = isCreatingProfile ? currencySymbol : activeProfile?.currency_symbol ?? 'Rs';

  useEffect(() => {
    if (initialized) return;

    if (isCreatingProfile) {
      const nextRows: Row[] = DEFAULT_CATEGORY_SEED.map((seed, idx) => ({
        categoryId: -(idx + 1),
        name: seed.name,
        color: seed.color,
        kind: seed.kind,
        percent: String(Math.round(seed.percent * 1000) / 10),
        amount: '',
      }));
      setRows(nextRows);
      setInitialized(true);
      return;
    }

    if (!categories || !activeProfile) return;

    setBudgetMode((existingPeriod?.budget_mode ?? activeProfile.budget_mode) as BudgetMode);
    setSalaryAmount(String(existingPeriod?.salary_amount ?? activeProfile.salary_amount ?? ''));

    const sourceAllocations = mode === 'edit' ? existingAllocations : mode === 'newMonth' ? latestAllocations : null;
    if (mode === 'edit' && !existingAllocations) return;
    if (mode === 'newMonth' && latestPeriod && !latestAllocations) return;

    const nextRows: Row[] = categories.map((c: Category) => {
      const existing = sourceAllocations?.find((a) => a.category_id === c.id);
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        kind: c.kind,
        percent: existing?.percent != null ? String(Math.round(existing.percent * 1000) / 10) : '',
        amount: existing ? String(Math.round(existing.amount_allocated)) : '',
      };
    });

    setRows(nextRows);
    setInitialized(true);
  }, [
    categories,
    activeProfile,
    existingPeriod,
    existingAllocations,
    latestAllocations,
    latestPeriod,
    initialized,
    isCreatingProfile,
    mode,
  ]);

  const salary = parseFloat(salaryAmount) || 0;

  const totals = useMemo(() => {
    if (budgetMode === 'percent') {
      const totalPercent = rows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0) / 100;
      return {
        totalAmount: totalPercent * salary,
        unallocated: (1 - totalPercent) * salary,
        over: totalPercent > 1.0001,
      };
    }
    const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    return {
      totalAmount,
      unallocated: salary - totalAmount,
      over: totalAmount > salary + 0.01,
    };
  }, [rows, budgetMode, salary]);

  function updateRow(categoryId: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.categoryId === categoryId ? { ...r, ...patch } : r)));
  }

  async function removeRow(categoryId: number) {
    if (isCreatingProfile) {
      setRows((prev) => prev.filter((r) => r.categoryId !== categoryId));
      show('Category removed');
      return;
    }
    await archiveCategory.mutateAsync(categoryId);
    setRows((prev) => prev.filter((r) => r.categoryId !== categoryId));
    show('Category removed');
  }

  async function addCategory(data: { name: string; value: number; kind: CategoryKind }) {
    const color = CATEGORY_PALETTE[rows.length % CATEGORY_PALETTE.length];

    if (isCreatingProfile) {
      setRows((prev) => [
        ...prev,
        {
          categoryId: -(prev.length + 1),
          name: data.name,
          color,
          kind: data.kind,
          percent: budgetMode === 'percent' ? String(data.value) : '',
          amount: budgetMode === 'amount' ? String(data.value) : '',
        },
      ]);
      show('Category added');
      return;
    }

    const id = await createCategory.mutateAsync({ name: data.name, color, kind: data.kind });
    setRows((prev) => [
      ...prev,
      {
        categoryId: id,
        name: data.name,
        color,
        kind: data.kind,
        percent: budgetMode === 'percent' ? String(data.value) : '',
        amount: budgetMode === 'amount' ? String(data.value) : '',
      },
    ]);
    show('Category added');
  }

  async function handleSave() {
    if (isCreatingProfile && !profileName.trim()) {
      show('Give this budget profile a name');
      return;
    }
    if (salary <= 0) {
      show('Enter a monthly amount greater than 0');
      return;
    }
    if (totals.over) {
      show(budgetMode === 'percent' ? 'Allocations exceed 100%' : 'Allocations exceed your monthly amount');
      return;
    }

    setSaving(true);
    try {
      if (isCreatingProfile) {
        const cycleDay = parseInt(cycleStartDay, 10) || 1;

        const newProfileId = await createProfile.mutateAsync({
          name: profileName.trim(),
          color: CATEGORY_PALETTE[0],
          currencyCode,
          currencySymbol,
          cycleStartDay: cycleDay,
          salaryAmount: salary,
          budgetMode,
        });
        await setActiveProfile.mutateAsync(newProfileId);

        const allocations: AllocationInput[] = [];
        for (const row of rows) {
          const categoryId = await createCategoryRow(db, newProfileId, {
            name: row.name,
            color: row.color,
            kind: row.kind,
          });
          allocations.push({
            categoryId,
            percent: budgetMode === 'percent' ? (parseFloat(row.percent) || 0) / 100 : null,
            amountAllocated:
              budgetMode === 'percent' ? ((parseFloat(row.percent) || 0) / 100) * salary : parseFloat(row.amount) || 0,
          });
        }

        const dates = toPeriodDates(new Date(), cycleDay);
        const newPeriodId = await createPeriodRow(db, newProfileId, {
          periodKey: dates.periodKey,
          cycleStartDate: dates.cycleStartDate,
          cycleEndDate: dates.cycleEndDate,
          salaryAmount: salary,
          budgetMode,
        });
        await replaceAllocationsForPeriod(db, newPeriodId, allocations);
        queryClient.invalidateQueries();

        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        return;
      }

      const cycleDay = activeProfile!.cycle_start_day;

      const dates =
        mode === 'edit' && existingPeriod
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
      show(e instanceof Error ? e.message : 'Something went wrong saving your budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onBack={isOnboarding ? undefined : () => navigation.goBack()}>
      {isCreatingProfile ? (
        <View className="rounded-[22px] border border-border bg-card px-[18px] py-4 mb-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            PROFILE NAME
          </Text>
          <TextInput
            value={profileName}
            onChangeText={setProfileName}
            placeholder="e.g. Freelance"
            placeholderTextColor={colors.placeholder}
            style={{
              marginTop: 6,
              height: 28,
              padding: 0,
              color: colors.textPrimary,
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: 16,
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
          />
          <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-4">
            CURRENCY
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-2">
            {CURRENCY_OPTIONS.map((c) => (
              <Pill
                key={c.code}
                label={`${c.symbol} ${c.label}`}
                size="sm"
                active={currencyCode === c.code}
                onPress={() => {
                  setCurrencyCode(c.code);
                  setCurrencySymbol(c.symbol);
                }}
              />
            ))}
          </View>
          <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-4">
            CYCLE START DAY
          </Text>
          <TextInput
            value={cycleStartDay}
            onChangeText={setCycleStartDay}
            keyboardType="number-pad"
            style={{
              marginTop: 6,
              height: 28,
              padding: 0,
              color: colors.textPrimary,
              fontFamily: 'SpaceMono_700Bold',
              fontSize: 16,
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
          />
        </View>
      ) : null}

      <SectionLabel number="01" label="SETUP" title="Allot the money" />

      <View className="rounded-[22px] border border-border bg-card px-[18px] py-4">
        <Text variant="mono" className="text-[9px] tracking-widest text-faint">
          MONTHLY SALARY · {symbol}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, height: 40 }}>
          <Text variant="mono" className="text-xl text-faint">
            {symbol}
          </Text>
          <TextInput
            value={salaryAmount}
            onChangeText={setSalaryAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            style={{
              flex: 1,
              height: 40,
              padding: 0,
              margin: 0,
              color: colors.textPrimary,
              fontFamily: 'SpaceMono_700Bold',
              fontSize: 26,
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
          />
        </View>
      </View>

      <View className="flex-row gap-1.5 bg-card border border-border p-[5px] rounded-full mt-3">
        <Pill
          label="PERCENT"
          className="flex-1"
          active={budgetMode === 'percent'}
          onPress={() => setBudgetMode('percent')}
        />
        <Pill
          label="AMOUNT"
          className="flex-1"
          active={budgetMode === 'amount'}
          onPress={() => setBudgetMode('amount')}
        />
      </View>
      <Text variant="label" className="mt-2.5 px-1 leading-5">
        {budgetMode === 'percent'
          ? 'Percent mode: every category is a share of salary. Change your salary and all budgets follow automatically.'
          : 'Amount mode: every category holds a fixed budget. The percentages shown are calculated from your salary.'}
      </Text>

      <View className="rounded-[22px] border border-border bg-card px-[18px] py-4 mt-3.5">
        <View className="flex-row justify-between items-baseline">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            STILL UNALLOTTED
          </Text>
          <Text variant="mono" className="text-[10px] text-faint">
            {formatAmount(totals.totalAmount, symbol)} / {formatAmount(salary, symbol)}
          </Text>
        </View>
        <Text
          className="mt-1"
          style={{
            fontSize: 26,
            lineHeight: 32,
            fontWeight: '700',
            letterSpacing: -0.2,
            color: totals.over ? colors.danger : totals.unallocated > 0.5 ? colors.accent : colors.success,
          }}
        >
          {formatAmount(totals.unallocated, symbol)}
        </Text>
        <View className="mt-3.5">
          <SegmentedBar
            segments={rows.map((r) => ({
              fraction: budgetMode === 'percent' ? (parseFloat(r.percent) || 0) / 100 : salary > 0 ? (parseFloat(r.amount) || 0) / salary : 0,
              color: r.color,
            }))}
          />
        </View>
      </View>

      {rows.map((row) => {
        const budgetValue =
          budgetMode === 'percent' ? ((parseFloat(row.percent) || 0) / 100) * salary : parseFloat(row.amount) || 0;
        const pctOfSalary = salary > 0 ? budgetValue / salary : 0;
        return (
          <View key={row.categoryId} className="rounded-[20px] border border-border bg-card px-4 py-3.5 mt-2.5">
            <View className="flex-row items-center gap-2.5">
              <View className="h-[9px] w-[9px] rounded-[2px]" style={{ backgroundColor: row.color }} />
              <Text variant="subheading" className="flex-1" numberOfLines={1}>
                {row.name}
              </Text>
              <Pressable onPress={() => removeRow(row.categoryId)} hitSlop={8}>
                <Text variant="mono" className="font-mono-bold text-[10px] text-faint">
                  DEL
                </Text>
              </Pressable>
            </View>
            <View className="flex-row items-center gap-3 mt-3">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  width: 120,
                  height: 40,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                }}
              >
                {budgetMode === 'amount' ? (
                  <Text variant="mono" className="text-xs text-faint">
                    {symbol}
                  </Text>
                ) : null}
                <TextInput
                  value={budgetMode === 'percent' ? row.percent : row.amount}
                  onChangeText={(v) => updateRow(row.categoryId, budgetMode === 'percent' ? { percent: v } : { amount: v })}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 40,
                    padding: 0,
                    margin: 0,
                    color: colors.textPrimary,
                    fontFamily: 'SpaceMono_700Bold',
                    fontSize: 14,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  }}
                />
                {budgetMode === 'percent' ? (
                  <Text variant="mono" className="text-xs text-faint">
                    %
                  </Text>
                ) : null}
              </View>
              <View className="flex-1 items-end min-w-0">
                <Text variant="mono" className="font-mono-bold text-sm">
                  {formatAmount(budgetValue, symbol)}
                </Text>
                <Text variant="mono" className="text-[10px] text-faint mt-0.5">
                  {budgetMode === 'percent' ? `= ${formatPercent(pctOfSalary)} of salary` : `${formatPercent(pctOfSalary)} of salary`}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      <DashedButton label="+ ADD CATEGORY" className="mt-3" onPress={() => setShowNewCategory(true)} />

      <CTAButton
        label={isOnboarding ? 'GET STARTED' : mode === 'newProfile' ? 'CREATE PROFILE' : mode === 'newMonth' ? 'START MONTH' : 'SAVE BUDGET'}
        className="mt-5"
        loading={saving}
        onPress={handleSave}
      />

      <CategoryFormSheet
        isOpen={showNewCategory}
        onClose={() => setShowNewCategory(false)}
        mode="category"
        valueLabel={budgetMode === 'percent' ? 'SHARE OF SALARY (%)' : `MONTHLY BUDGET (${symbol})`}
        namePlaceholder="e.g. Zakat"
        onSubmit={addCategory}
      />
    </Screen>
  );
}
