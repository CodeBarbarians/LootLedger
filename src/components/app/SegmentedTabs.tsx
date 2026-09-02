import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { Text } from './Text';

interface SegmentedTabsProps<T extends string> {
  options: readonly { value: T; label: string; activeColor?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A mutually exclusive choice presented as tabs rather than as a row of buttons:
 * one shared hairline with the active option underlined, instead of separate
 * filled pills. Use `Pill` for choices that really are chips — picking a
 * category, an account type — where several sit side by side and any of them can
 * be tapped independently.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  style,
}: SegmentedTabsProps<T>) {
  return (
    <View
      className={`flex-row ${className ?? ''}`}
      style={[{ borderBottomWidth: 1, borderBottomColor: colors.border }, style]}
    >
      {options.map((option) => {
        const active = option.value === value;
        const tint = option.activeColor ?? colors.accent;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center pt-1.5 pb-2.5"
            // Pulled down onto the container's hairline so the active tab reads as
            // joined to the content below it.
            style={{
              borderBottomWidth: 2,
              borderBottomColor: active ? tint : 'transparent',
              marginBottom: -1,
            }}
          >
            <Text
              variant="mono"
              className="font-mono-bold text-[11px] tracking-wider"
              style={{ color: active ? tint : colors.textMuted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
