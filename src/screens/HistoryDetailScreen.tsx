import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { StatusPill } from '../components/StatusPill';
import { Text } from '../components/Text';
import { useCategoriesWithProgress, usePeriodSummary } from '../hooks/useAggregates';
import { useSettings } from '../hooks/useSettings';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { formatAmount } from '../utils/currency';
import { formatPeriodLabel } from '../utils/cycle';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

export function HistoryDetailScreen({ route }: Props) {
  const { periodId } = route.params;
  const { data: settings } = useSettings();
  const { data: summary } = usePeriodSummary(periodId);
  const { data: categories } = useCategoriesWithProgress(periodId);
  const symbol = settings?.currency_symbol ?? 'Rs';

  if (!summary) return null;

  const overspent = summary.overspend > 0;

  return (
    <ScreenContainer>
      <Text variant="monoLabel" color={colors.accent}>
        {formatPeriodLabel(summary.period.cycle_start_date)}
      </Text>
      <Text variant="display" style={{ marginTop: spacing.sm }}>
        Month Summary
      </Text>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.summaryRow}>
          <SummaryStat label="Amount" value={formatAmount(summary.period.salary_amount, symbol)} />
          <SummaryStat label="Spent" value={formatAmount(summary.totalSpent, symbol)} />
        </View>
        <View style={[styles.summaryRow, { marginTop: spacing.lg }]}>
          <SummaryStat label="Allocated" value={formatAmount(summary.totalAllocated, symbol)} />
          <SummaryStat
            label="Remaining"
            value={formatAmount(summary.totalRemaining, symbol)}
            tone={summary.totalRemaining < 0 ? colors.danger : colors.success}
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {overspent ? (
            <StatusPill label={`Overspent by ${formatAmount(summary.overspend, symbol)}`} tone="danger" />
          ) : (
            <StatusPill label={`Saved ${formatAmount(Math.max(0, summary.saved), symbol)}`} tone="success" />
          )}
        </View>
      </Card>

      <Text variant="monoLabel" color={colors.textFaint} style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
        Categories
      </Text>

      {(categories ?? []).map((cat) => {
        const fraction = cat.allocated > 0 ? cat.spent / cat.allocated : 0;
        const over = cat.spent > cat.allocated;
        return (
          <Card key={cat.id} style={styles.categoryCard}>
            <View style={styles.categoryTopRow}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text variant="subheading" style={{ flex: 1 }}>
                {cat.name}
              </Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <ProgressBar fraction={fraction} />
            </View>
            <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
              <Text variant="label">
                Allocated <Text variant="body">{formatAmount(cat.allocated, symbol)}</Text>
              </Text>
              <Text variant="label">
                Spent <Text variant="body">{formatAmount(cat.spent, symbol)}</Text>
              </Text>
              <Text variant="label" color={over ? colors.danger : colors.textSecondary}>
                {over ? 'Over' : 'Left'}{' '}
                <Text variant="body" color={over ? colors.danger : colors.textPrimary}>
                  {formatAmount(Math.abs(cat.remaining), symbol)}
                </Text>
              </Text>
            </View>
          </Card>
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
  summaryRow: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  categoryCard: { marginBottom: spacing.md },
  categoryTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
