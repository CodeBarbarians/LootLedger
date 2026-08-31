import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../components/Card';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Text';
import { usePeriods } from '../hooks/usePeriods';
import { useSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors, spacing } from '../theme';
import { formatAmount } from '../utils/currency';
import { formatPeriodLabel } from '../utils/cycle';
import { HistoryRowSummary } from '../components/HistoryRowSummary';

type Props = TabScreenProps<'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { data: periods } = usePeriods();
  const { data: settings } = useSettings();
  const symbol = settings?.currency_symbol ?? 'Rs';

  return (
    <ScreenContainer>
      <Text variant="monoLabel" color={colors.accent}>
        Past Cycles
      </Text>
      <Text variant="display" style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
        History
      </Text>

      {(periods ?? []).length === 0 ? (
        <Text variant="label" color={colors.textMuted}>
          No past months yet — they'll show up here once a cycle ends.
        </Text>
      ) : null}

      {(periods ?? []).map((period) => (
        <Pressable key={period.id} onPress={() => navigation.navigate('HistoryDetail', { periodId: period.id })}>
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text variant="subheading">{formatPeriodLabel(period.cycle_start_date)}</Text>
              <Text variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
                {formatAmount(period.salary_amount, symbol)} budgeted
              </Text>
            </View>
            <HistoryRowSummary periodId={period.id} symbol={symbol} />
          </Card>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});
