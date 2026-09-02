import { View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Text } from './Text';

interface ShatterTextProps {
  text: string;
  /** 0 = settled, 1 = fully scattered. */
  progress: SharedValue<number>;
  className?: string;
  style?: TextStyle;
  /** Peak displacement in points. */
  amplitude?: number;
  variant?: 'mono' | 'body' | 'label' | 'display' | 'monoLabel';
}

/** Deterministic per-character jitter, so the text breaks apart the same way every time. */
function jitter(index: number, salt: number) {
  const value = Math.sin((index + 1) * salt) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

/**
 * Renders text as individual characters that can be knocked out of place and
 * settle back, driven by a shared value someone else owns (the brand mark). Only
 * for short, single-line headings — splitting characters removes the ability to
 * wrap.
 */
export function ShatterText({
  text,
  progress,
  className,
  style,
  amplitude = 7,
  variant,
}: ShatterTextProps) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from(text).map((character, index) => (
        <Character
          key={`${index}-${character}`}
          character={character}
          index={index}
          progress={progress}
          className={className}
          style={style}
          amplitude={amplitude}
          variant={variant}
        />
      ))}
    </View>
  );
}

function Character({
  character,
  index,
  progress,
  className,
  style,
  amplitude,
  variant,
}: {
  character: string;
  index: number;
  progress: SharedValue<number>;
  className?: string;
  style?: TextStyle;
  amplitude: number;
  variant?: ShatterTextProps['variant'];
}) {
  const offsetX = jitter(index, 12.9898);
  const offsetY = jitter(index, 78.233);
  const spin = jitter(index, 45.164) * 14;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * offsetX * amplitude },
      { translateY: progress.value * offsetY * amplitude },
      { rotate: `${progress.value * spin}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text variant={variant} className={className} style={style}>
        {/* Spaces need a non-breaking character or they collapse once split out. */}
        {character === ' ' ? ' ' : character}
      </Text>
    </Animated.View>
  );
}
