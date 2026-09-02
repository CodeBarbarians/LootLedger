import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BrandMark } from './BrandMark';

export interface MascotSpot {
  /** Where on the screen this thing sits, as a fraction of the screen's height. */
  y: number;
  /** Bumped when the mascot arrives, so the thing reacts to being poked. */
  nudge?: SharedValue<number>;
  /** A gag to play on arrival — pulling a chart out of shape, and so on. */
  onArrive?: () => void;
  /**
   * How far the mascot hauls the thing, in points. It drags itself the same way
   * at the same time, so the movement reads as the horns pulling rather than the
   * thing moving on its own.
   */
  pull?: { dx: number; dy: number };
}

const HOP_MS = 900;
const LINGER_MS = 700;
const SIZE = 30;
/**
 * Tug of war: heave, lose ground, heave harder, let go. The dashboard runs the
 * same envelope on whatever is being hauled, so the two pull against each other.
 */
const YANK_MS = 290;
const GIVE_MS = 220;
const HEAVE_MS = 300;
const HOLD_MS = 180;
const RELEASE_MS = 640;
export const TUG_MS = YANK_MS + GIVE_MS + HEAVE_MS + HOLD_MS + RELEASE_MS;

/**
 * The brand mark, off its leash: it hops around the screen and pokes whatever it
 * lands next to. Only rendered while play mode is on — the rest of the time the
 * mark stays in the header doing its idle animation.
 *
 * Targets are given as fractions of the screen height rather than measured
 * layouts, which keeps the mascot roughly correlated with what it disturbs
 * without every screen having to report its geometry.
 */
export function Mascot({ playing, spots }: { playing: boolean; spots: MascotSpot[] }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const tilt = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  useEffect(() => {
    if (!playing || reducedMotion || size.width === 0 || spots.length === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let index = Math.floor(Math.random() * spots.length);

    // Leans into each hop and rocks while it waits, so it never looks parked.
    tilt.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 620, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    function hop() {
      if (cancelled) return;
      const spot = spots[index % spots.length];
      index += 1;

      const landingX = 20 + Math.random() * Math.max(size.width - SIZE - 40, 1);
      const landingY = Math.min(
        Math.max(spot.y * size.height, 0),
        Math.max(size.height - SIZE, 0)
      );
      const pull = spot.pull;

      // Travel there, then haul: the drag is part of the same position animation,
      // so the mascot leans away with the thing instead of hovering beside it.
      const tug = (origin: number, delta: number) =>
        withSequence(
          withTiming(origin, { duration: HOP_MS, easing: Easing.inOut(Easing.cubic) }),
          withTiming(origin + delta, { duration: YANK_MS, easing: Easing.out(Easing.quad) }),
          // Loses ground — the thing pulls back.
          withTiming(origin + delta * 0.4, { duration: GIVE_MS, easing: Easing.inOut(Easing.quad) }),
          withTiming(origin + delta * 1.25, { duration: HEAVE_MS, easing: Easing.out(Easing.quad) }),
          withDelay(
            HOLD_MS,
            withTiming(origin, { duration: RELEASE_MS, easing: Easing.inOut(Easing.quad) })
          )
        );

      x.value = pull
        ? tug(landingX, pull.dx)
        : withTiming(landingX, { duration: HOP_MS, easing: Easing.inOut(Easing.cubic) });
      y.value = pull
        ? tug(landingY, pull.dy)
        : withTiming(landingY, { duration: HOP_MS, easing: Easing.inOut(Easing.cubic) });

      timer = setTimeout(() => {
        if (cancelled) return;
        // Landed — knock whatever is here out of place, then move on.
        if (spot.nudge) {
          spot.nudge.value = withSequence(
            withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 560, easing: Easing.inOut(Easing.quad) })
          );
        }
        spot.onArrive?.();
        timer = setTimeout(hop, spot.pull ? TUG_MS + 200 : LINGER_MS);
      }, HOP_MS);
    }

    hop();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      tilt.value = withTiming(0, { duration: 200 });
    };
  }, [playing, reducedMotion, size.width, size.height, spots, x, y, tilt]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${tilt.value * 9}deg` },
    ],
  }));

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {playing && !reducedMotion ? (
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, style]}>
          <BrandMark size={SIZE} />
        </Animated.View>
      ) : null}
    </View>
  );
}
