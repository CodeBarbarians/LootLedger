import { View } from 'react-native';
import { colors } from '../../theme';

interface BarProps {
  fraction: number; // 0..1+, values over 1 clamp visually
  color?: string;
  height?: number;
  trackClassName?: string;
}

export function Bar({ fraction, color, height = 6, trackClassName }: BarProps) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <View
      className={`w-full overflow-hidden rounded-full bg-border ${trackClassName ?? ''}`}
      style={{ height }}
    >
      <View
        style={{ width: `${clamped * 100}%`, height, backgroundColor: color ?? colors.accent, borderRadius: 999 }}
      />
    </View>
  );
}

/** A single track split into multiple colored segments (used for the "unallotted" summary bar). */
export function SegmentedBar({
  segments,
  height = 8,
}: {
  segments: { fraction: number; color: string }[];
  height?: number;
}) {
  return (
    <View className="w-full flex-row overflow-hidden rounded-full bg-border gap-px" style={{ height }}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={{ width: `${Math.max(0, s.fraction) * 100}%`, height, backgroundColor: s.color }}
        />
      ))}
    </View>
  );
}
