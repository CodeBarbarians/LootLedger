import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Text';
import { useCategoriesWithProgress, usePeriodSummary } from '../hooks/useAggregates';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors, spacing } from '../theme';
import { formatAmount, formatPercent } from '../utils/currency';
import { formatPeriodLabel } from '../utils/cycle';
import { Button } from '../components/Button';

type Props = TabScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { data: settings } = useSettings();
  const { data: period, isLoading: periodLoading, bounds } = useCurrentPeriod();
  const { data: summary } = usePeriodSummary(period?.id);
  const { data: categories } = useCategoriesWithProgress(period?.id);
  const symbol = settings?.currency_symbol ?? 'Rs';

  const overallFraction = useMemo(() => {
    if (!summary || summary.totalAllocated <= 0) return 0;
    return summary.totalSpent / summary.totalAllocated;
  }, [summary]);

  if (periodLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.accent} />
      </ScreenContainer>
    );
  }

  if (!period) {
    return (
      <ScreenContainer>
        <Text variant="monoLabel" color={colors.accent}>
          {formatPeriodLabel(bounds.start.toISOString())}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          New Month
        </Text>
        <Card style={{ marginTop: spacing.lg }}>
          <Text variant="body" color={colors.textSecondary}>
            You haven't set up a budget for this cycle yet. Start it now — you can copy last
            month's categories or start fresh.
          </Text>
          <Button
            label="Start This Month's Budget"
            onPress={() => navigation.navigate('BudgetSetup', { mode: 'newMonth' })}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text variant="monoLabel" color={colors.accent}>
        {formatPeriodLabel(period.cycle_start_date)}
      </Text>
      <View style={styles.headerRow}>
        <Text variant="display">Dashboard</Text>
        <Pressable onPress={() => navigation.navigate('BudgetSetup', { mode: 'edit', periodId: period.id })}>
          <Text variant="label" color={colors.accent}>
            Edit Budget
          </Text>
        </Pressable>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.summaryRow}>
          <SummaryStat label="Amount" value={formatAmount(period.salary_amount, symbol)} />
          <SummaryStat label="Allocated" value={formatAmount(summary?.totalAllocated ?? 0, symbol)} />
        </View>
        <View style={[styles.summaryRow, { marginTop: spacing.lg }]}>
          <SummaryStat label="Spent" value={formatAmount(summary?.totalSpent ?? 0, symbol)} />
          <SummaryStat
            label="Remaining"
            value={formatAmount(summary?.totalRemaining ?? 0, symbol)}
            tone={(summary?.totalRemaining ?? 0) < 0 ? colors.danger : colors.success}
          />
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <ProgressBar fraction={overallFraction} />
        </View>
      </Card>

      <Text variant="monoLabel" color={colors.textFaint} style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
        Categories
      </Text>

      {(categories ?? []).map((cat) => {
        const fraction = cat.allocated > 0 ? cat.spent / cat.allocated : 0;
        const over = cat.spent > cat.allocated;
        return (
          <Pressable
            key={cat.id}
            onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id, periodId: period.id })}
          >
            <Card style={styles.categoryCard}>
              <View style={styles.categoryTopRow}>
                <View style={styles.categoryNameRow}>
                  <View style={[styles.dot, { backgroundColor: cat.color }]} />
                  <Text variant="subheading">{cat.name}</Text>
                </View>
                {cat.percent != null ? (
                  <Text variant="mono" color={colors.textFaint}>
                    {formatPercent(cat.percent)}
                  </Text>
                ) : null}
              </View>
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar fraction={fraction} />
              </View>
              <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
                <Text variant="label">
                  Spent <Text variant="body">{formatAmount(cat.spent, symbol)}</Text>
                </Text>
                <Text variant="label" color={over ? colors.danger : colors.textSecondary}>
                  {over ? 'Over by ' : 'Remaining '}
                  <Text variant="body" color={over ? colors.danger : colors.textPrimary}>
                    {formatAmount(Math.abs(cat.remaining), symbol)}
                  </Text>
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </ScreenContainer>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="monoLabel">{label}</Text>
      <Text variant="heading" color={tone} style={{ marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  categoryCard: { marginBottom: spacing.md },
  categoryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
