import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { Text } from './Text';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentOn : colors.textPrimary} />
      ) : (
        <Text style={[textStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.dangerBorder },
};

const textStyles: Record<string, { color: string; fontFamily: string; fontSize: number }> = {
  primary: { color: colors.accentOn, fontFamily: fontFamily.headingMedium, fontSize: fontSize.md },
  secondary: { color: colors.textPrimary, fontFamily: fontFamily.headingMedium, fontSize: fontSize.md },
  ghost: { color: colors.accent, fontFamily: fontFamily.headingMedium, fontSize: fontSize.md },
  danger: { color: colors.danger, fontFamily: fontFamily.headingMedium, fontSize: fontSize.md },
};
