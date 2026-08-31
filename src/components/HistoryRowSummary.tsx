import { View } from 'react-native';
import { usePeriodSummary } from '../hooks/useAggregates';
import { formatAmount } from '../utils/currency';
import { StatusPill } from './StatusPill';

interface HistoryRowSummaryProps {
  periodId: number;
  symbol: string;
}

export function HistoryRowSummary({ periodId, symbol }: HistoryRowSummaryProps) {
  const { data: summary } = usePeriodSummary(periodId);
  if (!summary) return null;

  const overspent = summary.overspend > 0;

  return (
    <View style={{ alignItems: 'flex-end', gap: 4 }}>
      {overspent ? (
        <StatusPill label={`Over ${formatAmount(summary.overspend, symbol)}`} tone="danger" />
      ) : (
        <StatusPill label={`Saved ${formatAmount(Math.max(0, summary.saved), symbol)}`} tone="success" />
      )}
    </View>
  );
}
