import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { Text } from './Text';

interface FieldInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  hint?: string;
  prefix?: string;
}

export function FieldInput({ label, required, hint, prefix, style, onFocus, onBlur, ...rest }: FieldInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
          {required ? <Text color={colors.accent}> *</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {prefix ? (
          <Text variant="mono" color={colors.textSecondary} style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {hint ? (
        <Text variant="mono" color={colors.textFaint} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
    fontFamily: fontFamily.headingMedium,
    color: colors.textPrimary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
  },
  inputWrapFocused: {
    borderColor: colors.accent,
  },
  prefix: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'none',
  },
});
