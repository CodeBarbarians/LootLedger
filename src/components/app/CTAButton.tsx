import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { colors } from '../../theme';
import { Text } from './Text';

interface CTAButtonProps extends PressableProps {
  label: string;
  variant?: 'solid' | 'outline' | 'danger';
  loading?: boolean;
  className?: string;
}

export function CTAButton({ label, variant = 'solid', loading, className, disabled, ...rest }: CTAButtonProps) {
  const isDisabled = disabled || loading;
  const base = 'items-center justify-center rounded-[18px] py-[17px] px-4';
  const variantClass =
    variant === 'solid'
      ? 'bg-primary active:bg-[#ff7a45]'
      : variant === 'danger'
        ? 'border border-[#3a1c1c] active:bg-[#1a0f0d]'
        : 'border border-border-strong active:border-primary';

  return (
    <Pressable
      className={`${base} ${variantClass} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? colors.accentOn : colors.textPrimary} />
      ) : (
        <Text
          variant="mono"
          className="font-mono-bold text-xs tracking-widest"
          style={{ color: variant === 'solid' ? colors.accentOn : variant === 'danger' ? colors.danger : colors.textPrimary }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
