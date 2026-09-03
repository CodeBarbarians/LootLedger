import type { ReactNode, RefObject } from 'react';
import type { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

/**
 * Knocks its contents askew when `progress` is driven, so anything on screen can
 * react to being poked by the mascot without knowing what poked it.
 */
export function Wobble({
  progress,
  strength = 1,
  className,
  style,
  viewRef,
  children,
}: {
  progress: SharedValue<number>;
  strength?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Exposed so the mascot can measure where this ended up on screen. */
  viewRef?: RefObject<View | null>;
  children: ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * 6 * strength },
      { translateY: -progress.value * 3 * strength },
      { rotate: `${progress.value * 1.4 * strength}deg` },
      { scale: 1 + progress.value * 0.015 * strength },
    ],
  }));

  return (
    <Animated.View
      ref={viewRef as RefObject<Animated.View> | undefined}
      collapsable={false}
      className={className}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}
