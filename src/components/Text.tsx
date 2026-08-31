import { Text as RNText, type TextProps } from 'react-native';
import { colors, fontFamily, fontSize } from '../theme';

interface AppTextProps extends TextProps {
  variant?: 'display' | 'heading' | 'subheading' | 'body' | 'label' | 'mono' | 'monoLabel';
  color?: string;
}

const variantStyles = {
  display: { fontFamily: fontFamily.heading, fontSize: fontSize.display, color: colors.textPrimary },
  heading: { fontFamily: fontFamily.heading, fontSize: fontSize.xl, color: colors.textPrimary },
  subheading: { fontFamily: fontFamily.headingMedium, fontSize: fontSize.lg, color: colors.textPrimary },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.md, color: colors.textPrimary },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },
  mono: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.textSecondary },
  monoLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.textFaint,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
};

export function Text({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return <RNText style={[variantStyles[variant], color ? { color } : null, style]} {...rest} />;
}
