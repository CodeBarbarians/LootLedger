import { format } from 'date-fns';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { AddExpenseSheet } from '../components/app/AddExpenseSheet';
import { Bar } from '../components/app/Bar';
import { CTAButton } from '../components/app/CTAButton';
import { DashedButton } from '../components/app/DashedButton';
import { Ring } from '../components/app/Ring';
import { Screen } from '../components/app/Screen';
import { StatCell } from '../components/app/StatCell';
import { Text } from '../components/app/Text';
import { runThemeTransition } from '../components/app/themeTransition';
import { useCategoriesWithProgress, usePeriodSummary } from '../hooks/useAggregates';
import { useNetWorth } from '../hooks/useAccounts';
import { useBillsDueSoon } from '../hooks/useBills';
import { useGoalsWithProgress } from '../hooks/useGoals';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useActiveProfile } from '../hooks/useProfiles';
import { useSetThemeMode, useSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors, useThemeRepaint } from '../theme';
import { formatAmount, formatPercent } from '../utils/currency';
import { formatPeriodLabel } from '../utils/cycle';

type Props = TabScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const { data: period, isLoading: periodLoading, bounds } = useCurrentPeriod(profile?.id, profile?.cycle_start_day ?? 1);
  const { data: summary } = usePeriodSummary(profile?.id, period?.id);
  const { data: categories } = useCategoriesWithProgress(period?.id);
  const { data: netWorth } = useNetWorth(profile?.id);
  const { data: billsDueSoon } = useBillsDueSoon(profile?.id, 3);
  const { data: goals } = useGoalsWithProgress(profile?.id);
  const symbol = profile?.currency_symbol ?? 'Rs';
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { data: settings } = useSettings();
  const setThemeMode = useSetThemeMode();

  const themeButtonRef = useRef<View>(null);

  function toggleTheme() {
    if (!settings) return;
    const next = settings.theme_mode === 'light' ? 'dark' : 'light';
    // The write is deferred to the peak of the transition, so the theme flips
    // while the singularity covers the screen.
    runThemeTransition(themeButtonRef, next, () => setThemeMode(next));
  }

  if (periodLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!period) {
    return (
      <Screen>
        <Text variant="monoLabel" className="text-primary">
          {formatPeriodLabel(bounds.start.toISOString()).toUpperCase()}
        </Text>
        <Text variant="display" className="mt-1.5">
          New month
        </Text>
        <View className="mt-4 rounded-3xl border border-border bg-card p-5">
          <Text variant="label" className="leading-5">
            You haven&apos;t set up a budget for this cycle yet. Start it now — you can copy last
            month&apos;s categories or start fresh.
          </Text>
          <CTAButton
            label="START THIS MONTH'S BUDGET"
            className="mt-4"
            onPress={() => navigation.navigate('BudgetSetup', { mode: 'newMonth' })}
          />
        </View>
      </Screen>
    );
  }

  const ringFraction = summary && summary.totalAllocated > 0 ? summary.totalRemaining / summary.totalAllocated : 0;
  const over = (summary?.totalRemaining ?? 0) < -0.5;
  const ringColor = over ? colors.danger : colors.accent;

  return (
    <Screen>
      <Pressable
        onPress={() => navigation.navigate('BudgetProfiles')}
        className="flex-row items-center gap-1.5 self-start mb-3 rounded-full border border-border-strong px-2.5 py-1.5 active:border-primary"
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: profile?.color ?? colors.accent }} />
        <Text variant="mono" className="font-mono-bold text-[9px] tracking-wider text-primary" numberOfLines={1}>
          {profile?.name ?? 'PROFILE'}
        </Text>
      </Pressable>

      <View className="flex-row items-start justify-between gap-3 mb-5">
        <View className="flex-row items-center gap-2.5">
          <BrandMark size={30} />
          <View>
            <Text variant="mono" className="text-[10px] tracking-[3px] text-primary">
              {formatPeriodLabel(period.cycle_start_date).toUpperCase()}
            </Text>
            <Text style={{ fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 }} className="font-heading mt-0.5">
              Your budget
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2 mt-1.5">
          <Pressable
            ref={themeButtonRef}
            onPress={toggleTheme}
            hitSlop={8}
            className="rounded-full border border-border-strong px-3 py-2 active:border-primary"
          >
            <Text variant="mono" className="font-mono-bold text-[10px] tracking-wider text-primary">
              {settings?.theme_mode === 'light' ? '☾' : '☀'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('BudgetSetup', { mode: 'edit', periodId: period.id })}
            className="rounded-full border border-border-strong px-3 py-2 active:border-primary"
          >
            <Text variant="mono" className="font-mono-bold text-[10px] tracking-wider text-primary">
              {profile?.budget_mode === 'percent' ? '% MODE' : 'RS MODE'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="rounded-3xl border border-border bg-card px-5 pt-[22px] pb-[18px]">
        <View className="flex-row items-center gap-[18px]">
          <Ring
            fraction={ringFraction}
            color={ringColor}
            label={`${Math.round(Math.max(0, Math.min(1, ringFraction)) * 100)}%`}
            sublabel="BUDGET LEFT"
          />
          <View className="flex-1 min-w-0">
            <Text variant="mono" className="text-[9px] tracking-[3px] text-faint">
              SAFE TO SPEND
            </Text>
            <Text
              className="mt-1"
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 30,
                lineHeight: 38,
                letterSpacing: -0.4,
                color: over ? colors.danger : colors.textPrimary,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatAmount(summary?.totalRemaining ?? 0, symbol)}
            </Text>
            <Text variant="mono" className="mt-2 text-[10px] leading-4">
              {(summary?.overCount ?? 0) > 0
                ? `${summary!.overCount} ${summary!.overCount === 1 ? 'category' : 'categories'} over budget`
                : 'every category inside its budget'}
            </Text>
          </View>
        </View>

        <View className="flex-row mt-5 pt-4 border-t border-border">
          <StatCell label="SALARY" value={formatAmount(period.salary_amount, symbol)} className="flex-1" />
          <StatCell
            label="ALLOTTED"
            value={formatAmount(summary?.totalAllocated ?? 0, symbol)}
            className="flex-1 pl-3 border-l border-border"
          />
          <StatCell
            label="UNALLOTTED"
            value={formatAmount(period.salary_amount - (summary?.totalAllocated ?? 0), symbol)}
            color={period.salary_amount - (summary?.totalAllocated ?? 0) < -0.5 ? colors.danger : colors.textPrimary}
            className="flex-1 pl-3 border-l border-border"
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Accounts')}
          className="flex-row items-center justify-between mt-4 pt-4 border-t border-border active:opacity-70"
        >
          <StatCell
            label="NET WORTH"
            value={formatAmount(netWorth?.netWorth ?? 0, symbol)}
            color={(netWorth?.netWorth ?? 0) < 0 ? colors.danger : colors.textPrimary}
          />
          <Text variant="mono" className="font-mono-bold text-[10px] text-primary">
            ACCOUNTS →
          </Text>
        </Pressable>
      </View>

      <View className="flex-row gap-2.5 mt-3">
        <View className="flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            SPENT
          </Text>
          <Text style={{ fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 }} className="font-heading mt-1">
            {formatAmount(summary?.totalSpent ?? 0, symbol)}
          </Text>
        </View>
        <View className="flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            TO SAVINGS
          </Text>
          <Text style={{ fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2, color: colors.success }} className="font-heading mt-1">
            {formatAmount(summary?.toSavings ?? 0, symbol)}
          </Text>
        </View>
      </View>

      {(billsDueSoon ?? []).length > 0 ? (
        <>
          <View className="flex-row items-baseline justify-between mt-6 mb-3 px-0.5">
            <Text variant="monoLabel">Bills due soon</Text>
            <Pressable onPress={() => navigation.navigate('Bills')}>
              <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
                VIEW ALL →
              </Text>
            </Pressable>
          </View>

          {(billsDueSoon ?? []).map((bill) => (
            <Pressable
              key={bill.id}
              onPress={() => navigation.navigate('Bills')}
              className="flex-row items-center justify-between rounded-[18px] border border-border bg-card px-4 py-3.5 mb-2.5 active:border-border-strong"
            >
              <View className="flex-1 min-w-0 mr-3">
                <Text variant="subheading" numberOfLines={1}>
                  {bill.name}
                </Text>
                <Text variant="mono" className="text-[10px] text-faint mt-1">
                  DUE {format(new Date(bill.nextDueDate), 'MMM d').toUpperCase()}
                </Text>
              </View>
              <Text variant="mono" className="font-mono-bold text-xs">
                {formatAmount(bill.amount, symbol)}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {(goals ?? []).length > 0 ? (
        <>
          <View className="flex-row items-baseline justify-between mt-6 mb-3 px-0.5">
            <Text variant="monoLabel">Goals</Text>
            <Pressable onPress={() => navigation.navigate('Goals')}>
              <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
                VIEW ALL →
              </Text>
            </Pressable>
          </View>

          <View className="rounded-[20px] border border-border bg-card px-4 pt-[15px] pb-3.5 mb-2.5">
            {(goals ?? []).map((goal, i) => {
              const fraction = goal.target_amount > 0 ? goal.contributed / goal.target_amount : 0;
              return (
                <View key={goal.id} style={{ marginTop: i === 0 ? 0 : 14 }}>
                  <View className="flex-row items-center justify-between">
                    <Text style={{ fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <Text variant="mono" className="text-[10px] text-faint">
                      {formatAmount(goal.contributed, symbol)} / {formatAmount(goal.target_amount, symbol)}
                    </Text>
                  </View>
                  <View className="mt-2">
                    <Bar fraction={fraction} color={goal.color} height={5} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <View className="flex-row items-baseline justify-between mt-6 mb-3 px-0.5">
        <Text variant="monoLabel">Categories</Text>
        <Pressable onPress={() => navigation.navigate('BudgetSetup', { mode: 'edit', periodId: period.id })}>
          <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
            EDIT →
          </Text>
        </Pressable>
      </View>

      {(categories ?? []).map((cat) => {
        const left = cat.remaining;
        const catOver = left < -0.5;
        const share = period.salary_amount > 0 ? cat.allocated / period.salary_amount : 0;
        return (
          <Pressable
            key={cat.id}
            onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id, periodId: period.id })}
            className="rounded-[20px] border border-border bg-card px-4 pt-[15px] pb-3.5 mb-2.5 active:border-border-strong"
          >
            <View className="flex-row items-center gap-2.5">
              <View className="h-[9px] w-[9px] rounded-[2px]" style={{ backgroundColor: cat.color }} />
              <Text variant="subheading" className="flex-1" numberOfLines={1}>
                {cat.name}
              </Text>
              <Text variant="mono" className="font-mono-bold text-[11px] text-faint">
                {formatPercent(share)}
              </Text>
            </View>
            <View className="flex-row items-baseline gap-1.5 mt-2.5">
              <Text
                style={{ fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2, color: catOver ? colors.danger : colors.textPrimary }}
                className="font-heading"
              >
                {formatAmount(Math.abs(left), symbol)}
              </Text>
              <Text variant="mono" className="text-[10px] text-faint">
                {catOver ? 'over budget' : 'pending'}
              </Text>
            </View>
            <View className="mt-[11px]">
              <Bar fraction={cat.allocated > 0 ? cat.spent / cat.allocated : 0} color={catOver ? colors.danger : cat.color} />
            </View>
            <View className="flex-row justify-between mt-2">
              <Text variant="mono" className="text-[10px] text-faint">
                {formatAmount(cat.spent, symbol)} spent
              </Text>
              <Text variant="mono" className="text-[10px] text-faint">
                {formatAmount(cat.allocated, symbol)} budget
              </Text>
            </View>
          </Pressable>
        );
      })}

      <DashedButton
        label="+ LOG AN EXPENSE"
        className="mt-1"
        onPress={() => setShowAddExpense(true)}
      />

      <AddExpenseSheet
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        periodId={period.id}
        categories={categories ?? []}
        currencySymbol={symbol}
      />
    </Screen>
  );
}

function BrandMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Path d="M47 42 C34 25 19 23 8 32 C23 31 34 35 43 48 Z" fill={colors.accent} />
      <Path d="M73 42 C86 25 101 23 112 32 C97 31 86 35 77 48 Z" fill={colors.accent} />
      <Path
        d="M50 54 L35 70 L50 86"
        stroke={colors.textPrimary}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M70 54 L85 70 L70 86"
        stroke={colors.textPrimary}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={55.5} y={50} width={9} height={42} rx={4.5} fill={colors.textPrimary} />
    </Svg>
  );
}
