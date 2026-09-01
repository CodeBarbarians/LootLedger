import { Pressable, View } from 'react-native';
import { usePeriodSummary } from '../../hooks/useAggregates';
import type { BudgetPeriod } from '../../db/types';
import { colors } from '../../theme';
import { formatAmount } from '../../utils/currency';
import { formatPeriodLabel } from '../../utils/cycle';
import { Bar } from './Bar';
import { Text } from './Text';

interface HistoryCardProps {
  period: BudgetPeriod;
  symbol: string;
  onPress: () => void;
}

export function HistoryCard({ period, symbol, onPress }: HistoryCardProps) {
  const { data: summary } = usePeriodSummary(period.id);
  if (!summary) return null;

  const diff = period.salary_amount - summary.totalSpent;
  const over = summary.totalSpent > summary.totalAllocated + 0.5;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-[20px] border border-border bg-card px-4 py-[15px] mb-2.5 active:border-border-strong"
    >
      <View className="flex-row items-center justify-between gap-2.5">
        <Text style={{ fontSize: 15, lineHeight: 19, fontWeight: '700' }} className="font-heading">
          {formatPeriodLabel(period.cycle_start_date)}
        </Text>
        <View
          className="rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: over ? colors.dangerBg : colors.successBg }}
        >
          <Text
            variant="mono"
            className="font-mono-bold text-[9px] tracking-wider"
            style={{ color: over ? colors.danger : colors.success }}
          >
            {over ? 'OVERSPENT' : 'ON BUDGET'}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-4 mt-[11px]">
        <View>
          <Text variant="mono" className="text-[9px] text-faint">
            SALARY
          </Text>
          <Text variant="mono" className="font-mono-bold text-xs mt-0.5">
            {formatAmount(period.salary_amount, symbol)}
          </Text>
        </View>
        <View>
          <Text variant="mono" className="text-[9px] text-faint">
            SPENT
          </Text>
          <Text variant="mono" className="font-mono-bold text-xs mt-0.5">
            {formatAmount(summary.totalSpent, symbol)}
          </Text>
        </View>
        <View>
          <Text variant="mono" className="text-[9px] text-faint">
            {diff >= 0 ? 'SAVED' : 'OVER'}
          </Text>
          <Text
            variant="mono"
            className="font-mono-bold text-xs mt-0.5"
            style={{ color: diff >= 0 ? colors.success : colors.danger }}
          >
            {formatAmount(diff, symbol)}
          </Text>
        </View>
      </View>

      <View className="mt-3">
        <Bar
          fraction={period.salary_amount > 0 ? summary.totalSpent / period.salary_amount : 0}
          height={5}
          color={over ? colors.danger : colors.success}
        />
      </View>
    </Pressable>
  );
}
