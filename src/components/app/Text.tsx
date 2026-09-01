import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'display' | 'heading' | 'subheading' | 'body' | 'label' | 'mono' | 'monoLabel';

interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  display: 'font-heading text-[28px] text-foreground',
  heading: 'font-heading text-xl text-foreground',
  subheading: 'font-heading-medium text-base text-foreground',
  body: 'font-body text-sm text-foreground',
  label: 'font-body text-[13px] text-muted-foreground',
  mono: 'font-mono text-xs text-muted-foreground',
  monoLabel: 'font-mono text-[10px] tracking-[2px] uppercase text-faint',
};

export function Text({ variant = 'body', className, style, ...rest }: AppTextProps) {
  return (
    <RNText
      className={`${variantClass[variant]} ${className ?? ''}`}
      style={[{ includeFontPadding: false }, style]}
      {...rest}
    />
  );
}
