import { Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';

interface DashedButtonProps extends PressableProps {
  label: string;
  className?: string;
}

export function DashedButton({ label, className, ...rest }: DashedButtonProps) {
  return (
    <Pressable
      className={`items-center justify-center rounded-2xl border border-dashed border-border-strong py-4 active:border-primary ${className ?? ''}`}
      {...rest}
    >
      <Text variant="mono" className="font-mono-bold tracking-widest text-muted-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
