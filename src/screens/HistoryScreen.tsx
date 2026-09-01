import { View } from 'react-native';
import { HistoryCard } from '../components/app/HistoryCard';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useHistoryTotals } from '../hooks/useAggregates';
import { usePeriods } from '../hooks/usePeriods';
import { useSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = TabScreenProps<'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { data: periods } = usePeriods();
  const { data: settings } = useSettings();
  const { data: totals } = useHistoryTotals();
  const symbol = settings?.currency_symbol ?? 'Rs';

  return (
    <Screen>
      <SectionLabel number="03" label="HISTORY" title="Month by month" />

      <View className="flex-row gap-2.5 mb-4">
        <View className="flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            TOTAL SAVED
          </Text>
          <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', color: colors.success }} className="font-heading mt-1">
            {formatAmount(totals?.totalSaved ?? 0, symbol)}
          </Text>
        </View>
        <View className="flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            TOTAL OVER
          </Text>
          <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', color: colors.danger }} className="font-heading mt-1">
            {formatAmount(totals?.totalOver ?? 0, symbol)}
          </Text>
        </View>
      </View>

      {(periods ?? []).length === 0 ? (
        <Text variant="label">No past months yet — they&apos;ll show up here once a cycle ends.</Text>
      ) : null}

      {(periods ?? []).map((period) => (
        <HistoryCard
          key={period.id}
          period={period}
          symbol={symbol}
          onPress={() => navigation.navigate('HistoryDetail', { periodId: period.id })}
        />
      ))}
    </Screen>
  );
}
