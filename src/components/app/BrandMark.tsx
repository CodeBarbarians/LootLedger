import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

/**
 * The mark, split into parts that move independently so it reads as a creature
 * rather than an icon: the horns juggle one after the other and the mouth talks.
 * Idle motion is brief and separated by long pauses — it sits at the top of the
 * dashboard the whole time, so constant fidgeting would be a distraction.
 * Tapping it makes it perform on demand.
 *
 * Each part is its own Svg in its own Animated.View rather than animated SVG
 * props, which keeps the transforms on the UI thread as plain view styles.
 */

/** One horn lifting and settling back. */
const LIFT_MS = 260;
const DROP_MS = 420;

export function BrandMark({ size, nudge }: { size: number; nudge?: SharedValue<number> }) {
  const leftHorn = useSharedValue(0);
  const rightHorn = useSharedValue(0);
  const talk = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const juggle = useCallback(
    (rounds: number, startDelay: number) => {
      const lift = () =>
        withSequence(
          withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: DROP_MS, easing: Easing.inOut(Easing.quad) })
        );
      // The right horn starts half a beat later, so they alternate rather than
      // shrugging in unison.
      const offset = LIFT_MS + DROP_MS / 2;
      const left = [];
      const right = [];
      for (let i = 0; i < rounds; i++) {
        left.push(lift());
        right.push(lift());
      }
      leftHorn.value = withDelay(startDelay, withSequence(...left));
      rightHorn.value = withDelay(startDelay + offset, withSequence(...right));
    },
    [leftHorn, rightHorn]
  );

  useEffect(() => {
    if (reducedMotion) return;
    // Idle: one alternating juggle, then a long pause before the next.
    const round = LIFT_MS + DROP_MS;
    leftHorn.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: DROP_MS, easing: Easing.inOut(Easing.quad) }),
        withDelay(round + 3000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
    rightHorn.value = withRepeat(
      withSequence(
        withDelay(1400 + round, withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: DROP_MS, easing: Easing.inOut(Easing.quad) }),
        withDelay(3000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
    talk.value = withRepeat(
      withSequence(
        withDelay(3200, withTiming(1, { duration: 120 })),
        withTiming(0, { duration: 120 }),
        withTiming(1, { duration: 110 }),
        withTiming(0, { duration: 150 }),
        withDelay(4200, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [reducedMotion, leftHorn, rightHorn, talk]);

  function onPress() {
    if (reducedMotion) return;
    // Interrupts the idle loop with a livelier run, then the loop resumes on its
    // next tick.
    juggle(2, 0);
    // Shoves whatever sits next to the mark and lets it settle back on the same
    // beat as the horns, so the two read as one movement.
    if (nudge) {
      nudge.value = withSequence(
        withTiming(1, { duration: LIFT_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: DROP_MS + LIFT_MS, easing: Easing.inOut(Easing.quad) })
      );
    }
    talk.value = withSequence(
      withTiming(1, { duration: 110 }),
      withTiming(0, { duration: 110 }),
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 140 })
    );
  }

  const leftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -leftHorn.value * size * 0.1 },
      { rotate: `${-leftHorn.value * 8}deg` },
    ],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -rightHorn.value * size * 0.1 },
      { rotate: `${rightHorn.value * 8}deg` },
    ],
  }));

  const mouthStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 - talk.value * 0.42 }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, leftStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
          <Path d="M47 42 C34 25 19 23 8 32 C23 31 34 35 43 48 Z" fill={colors.accent} />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, rightStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
          <Path d="M73 42 C86 25 101 23 112 32 C97 31 86 35 77 48 Z" fill={colors.accent} />
        </Svg>
      </Animated.View>

      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
          <Path
            d="M50 54 L35 70 L50 86"
            stroke={colors.textPrimary}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M70 54 L85 70 L70 86"
            stroke={colors.textPrimary}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, mouthStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
          <Rect x={55.5} y={50} width={9} height={42} rx={4.5} fill={colors.textPrimary} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
