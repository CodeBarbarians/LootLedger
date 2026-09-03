import { View } from 'react-native';
import { useMemo, useRef } from 'react';
import { HistoryCard } from '../components/app/HistoryCard';
import { Screen } from '../components/app/Screen';
import { useScreenTour } from '../components/app/tour';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useHistoryTotals } from '../hooks/useAggregates';
import { usePeriods } from '../hooks/usePeriods';
import { useActiveProfile } from '../hooks/useProfiles';
import type { TabScreenProps } from '../navigation/types';
import { colors, useThemeRepaint } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = TabScreenProps<'History'>;

export function HistoryScreen({ navigation }: Props) {
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const { data: periods } = usePeriods(profile?.id);
  const { data: totals } = useHistoryTotals(profile?.id);
  const symbol = profile?.currency_symbol ?? 'Rs';

  const totalsRef = useRef<View>(null);
  const listRef = useRef<View>(null);

  const tour = useScreenTour(
    'History',
    useMemo(
      () => [
        { ref: totalsRef, text: 'Everything you have put away, and everything you went over, across all finished months.' },
        { ref: listRef, text: 'One card per cycle you have closed. Tap any of them to see where its money went.' },
      ],
      []
    )
  );

  return (
    <Screen tour={tour}>
      <SectionLabel number="03" label="HISTORY" title="Month by month" />

      <View ref={totalsRef} collapsable={false} className="flex-row gap-2.5 mb-4">
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

      <View ref={listRef} collapsable={false}>
      {(periods ?? []).map((period) => (
        <HistoryCard
          key={period.id}
          period={period}
          profileId={profile?.id}
          symbol={symbol}
          onPress={() => navigation.navigate('HistoryDetail', { periodId: period.id })}
        />
      ))}
      </View>
    </Screen>
  );
}
