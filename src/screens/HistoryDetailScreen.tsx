import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Bar } from '../components/app/Bar';
import { Screen } from '../components/app/Screen';
import { useScreenTour } from '../components/app/tour';
import { Text } from '../components/app/Text';
import { useCategoriesWithProgress, usePeriodSummary } from '../hooks/useAggregates';
import { useActiveProfile } from '../hooks/useProfiles';
import type { RootStackParamList } from '../navigation/types';
import { colors, useThemeRepaint } from '../theme';
import { formatAmount } from '../utils/currency';
import { formatPeriodLabel } from '../utils/cycle';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

export function HistoryDetailScreen({ route, navigation }: Props) {
  useThemeRepaint();
  const { periodId } = route.params;
  const { data: profile } = useActiveProfile();
  const { data: summary } = usePeriodSummary(profile?.id, periodId);
  const { data: categories } = useCategoriesWithProgress(periodId);
  const symbol = profile?.currency_symbol ?? 'Rs';

  if (!summary) return null;

  const saved = Math.max(0, summary.saved);
  const overCats = (categories ?? []).filter((c) => c.spent > c.allocated + 0.5);

  const statsRef = useRef<View>(null);
  const salaryRef = useRef<View>(null);

  const tour = useScreenTour(
    'HistoryDetail',
    useMemo(
      () => [
        { ref: statsRef, text: 'How that month landed: what you kept, and what you went over.' },
        { ref: salaryRef, text: 'The money that came in, against what actually went out.' },
      ],
      []
    )
  );

  return (
    <Screen tour={tour} onBack={() => navigation.goBack()} topBarTitle="History">
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.2 }} className="font-heading">
          {formatPeriodLabel(summary.period.cycle_start_date)}
        </Text>
        <Pressable onPress={() => navigation.navigate('BudgetSetup', { mode: 'edit', periodId })}>
          <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
            EDIT →
          </Text>
        </Pressable>
      </View>

      <View ref={statsRef} collapsable={false} className="flex-row gap-2.5 mt-4">
        <View className="flex-1 rounded-[20px] border border-border bg-card p-4">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            SAVED
          </Text>
          <Text style={{ fontSize: 20, lineHeight: 25, fontWeight: '700', color: colors.success }} className="font-heading mt-1.5">
            {formatAmount(saved, symbol)}
          </Text>
          <Text variant="mono" className="text-[10px] text-faint mt-1">
            {summary.period.salary_amount > 0 ? Math.round((saved / summary.period.salary_amount) * 100) : 0}% of salary
          </Text>
        </View>
        <View className="flex-1 rounded-[20px] border border-border bg-card p-4">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            OVERSPENT
          </Text>
          <Text
            style={{ fontSize: 20, lineHeight: 25, fontWeight: '700', color: summary.overspend > 0.5 ? colors.danger : colors.textMuted }}
            className="font-heading mt-1.5"
          >
            {formatAmount(summary.overspend, symbol)}
          </Text>
          <Text variant="mono" className="text-[10px] text-faint mt-1">
            {summary.overspend > 0.5 ? `across ${overCats.length} categories` : 'nothing over budget'}
          </Text>
        </View>
      </View>

      <View ref={salaryRef} collapsable={false} className="rounded-[20px] border border-border bg-card px-[18px] py-4 mt-2.5 flex-row justify-between">
        <View>
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            SALARY
          </Text>
          <Text variant="mono" className="font-mono-bold text-[13px] mt-1">
            {formatAmount(summary.period.salary_amount, symbol)}
          </Text>
        </View>
        <View>
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            ALLOTTED
          </Text>
          <Text variant="mono" className="font-mono-bold text-[13px] mt-1">
            {formatAmount(summary.totalAllocated, symbol)}
          </Text>
        </View>
        <View>
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            SPENT
          </Text>
          <Text variant="mono" className="font-mono-bold text-[13px] mt-1">
            {formatAmount(summary.totalSpent, symbol)}
          </Text>
        </View>
      </View>

      <Text variant="monoLabel" className="mt-6 mb-2.5 px-0.5">
        Per category
      </Text>

      {(categories ?? []).map((cat) => {
        const diff = cat.allocated - cat.spent;
        const over = diff < -0.5;
        return (
          <View key={cat.id} className="py-[13px] px-0.5 border-b border-divider">
            <View className="flex-row items-center gap-[9px]">
              <View className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: cat.color }} />
              <Text style={{ fontSize: 13, fontWeight: '600' }} className="flex-1" numberOfLines={1}>
                {cat.name}
              </Text>
              <Text
                variant="mono"
                className="font-mono-bold text-xs"
                style={{ color: over ? colors.danger : colors.success }}
              >
                {diff < 0 ? '+' : '−'}
                {formatAmount(diff, symbol)}
              </Text>
            </View>
            <View className="mt-[9px]">
              <Bar
                fraction={cat.allocated > 0 ? cat.spent / cat.allocated : 0}
                height={5}
                color={over ? colors.danger : cat.color}
              />
            </View>
            <View className="flex-row justify-between mt-1.5">
              <Text variant="mono" className="text-[10px] text-faint">
                {formatAmount(cat.spent, symbol)} spent
              </Text>
              <Text variant="mono" className="text-[10px] text-faint">
                {formatAmount(cat.allocated, symbol)} budget
              </Text>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}
