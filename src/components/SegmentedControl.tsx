import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.cardInset,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontFamily: fontFamily.headingMedium,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accentOn,
  },
});
