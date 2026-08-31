import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

interface ProgressBarProps {
  fraction: number; // 0..1+ (values over 1 render as overflow/red)
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ fraction, color, trackColor, height = 6 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const isOver = fraction > 1;
  const fillColor = color ?? (isOver ? colors.danger : colors.accent);

  return (
    <View style={[styles.track, { backgroundColor: trackColor ?? colors.cardInset, height }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: fillColor, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
