import { View } from 'react-native';
import { Text } from './Text';

interface StatCellProps {
  label: string;
  value: string;
  color?: string;
  valueSize?: number;
  className?: string;
}

export function StatCell({ label, value, color, valueSize = 13, className }: StatCellProps) {
  return (
    <View className={className}>
      <Text variant="mono" className="text-[8px] tracking-widest text-faint">
        {label}
      </Text>
      <Text
        variant="mono"
        className="font-mono-bold mt-1"
        style={{ fontSize: valueSize, color }}
      >
        {value}
      </Text>
    </View>
  );
}
