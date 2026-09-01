import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFamily } from '../../theme';
import { Text } from './Text';

interface RingProps {
  fraction: number; // 0..1 remaining
  color: string;
  size?: number;
  label: string;
  sublabel: string;
}

export function Ring({ fraction, color, size = 116, label, sublabel }: RingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, fraction));
  const offset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4 }}>
          {label}
        </Text>
        <Text
          className="mt-1 text-faint"
          style={{ fontFamily: fontFamily.mono, fontSize: 8, letterSpacing: 1.2 }}
        >
          {sublabel}
        </Text>
      </View>
    </View>
  );
}
