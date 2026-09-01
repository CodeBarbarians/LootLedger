import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { Text } from './Text';

interface PillProps extends Omit<PressableProps, 'style'> {
  label: string;
  active?: boolean;
  activeColor?: string; // background when active, defaults to accent
  activeTextColor?: string;
  inactiveTextColor?: string;
  size?: 'sm' | 'md';
  mono?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Pill({
  label,
  active,
  activeColor,
  activeTextColor,
  inactiveTextColor,
  size = 'md',
  mono = true,
  className,
  style,
  ...rest
}: PillProps) {
  const padding = size === 'sm' ? 'px-3 py-2' : 'px-3.5 py-2.5';
  const bg = active ? activeColor ?? colors.accent : 'transparent';
  const border = active ? activeColor ?? colors.accent : colors.borderStrong;
  const textColor = active ? activeTextColor ?? colors.accentOn : inactiveTextColor ?? colors.textMuted;

  return (
    <Pressable
      className={`items-center justify-center rounded-full ${padding} ${className ?? ''}`}
      style={[{ backgroundColor: bg, borderWidth: 1, borderColor: border }, style]}
      {...rest}
    >
      <Text
        variant={mono ? 'mono' : 'body'}
        className={mono ? 'font-mono-bold tracking-wider' : ''}
        style={{ color: textColor }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
