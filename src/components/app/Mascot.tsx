import { useEffect, useRef, useState, type RefObject } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme';
import { BrandMark } from './BrandMark';
import { Text } from './Text';
import { onThemeFlipped } from './themeTransition';
import type { TourStep } from './tour';

export interface MascotTarget {
  /**
   * The thing on screen. Measured live rather than given as a position, so the
   * mascot follows it as the page scrolls instead of grabbing at where it used
   * to be.
   */
  ref: RefObject<View | null>;
  /** Bumped on contact, so the thing reacts to being poked. */
  nudge?: SharedValue<number>;
  /** A gag to play when it commits to a full tug — pulling a chart out of shape. */
  onArrive?: () => void;
  /**
   * How far it hauls the thing, in points. It drags itself the same way at the
   * same time, so the movement reads as the horns pulling rather than two things
   * animating side by side. Targets without a pull can only be studied or poked.
   */
  pull?: { dx: number; dy: number };
  /** How much it wants this one, 0..1. Weighed against distance and novelty. */
  appeal?: number;
}

/**
 * Stable stand-in for "no targets".
 *
 * This has to be a module-level constant, not a `= []` default in the parameter
 * list: that literal is a fresh array on every render, and it is a dependency of
 * the loop below. Showing a line re-renders this component, so a per-render
 * default made the loop tear itself down and restart from its first step the
 * instant it opened its mouth.
 */
const NO_TARGETS: MascotTarget[] = [];

/** A walkthrough for the mascot to present, handed over by `Screen`. */
export interface MascotTour {
  running: boolean;
  steps: TourStep[];
  onDone: () => void;
  /** Brings a step's element into view before the mascot goes to it. */
  reveal?: (ref: RefObject<View | null>) => Promise<void>;
}

const SIZE = 30;
const HOP_MS = 620;
/** The beat before a hop where it turns towards what it picked. */
const THINK_MS = 380;
const CROUCH_MS = 160;
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
 * The mark's answer to being swallowed by the theme transition.
 *
 * The theme swaps at the *peak* of that animation, with the singularity still
 * covering the screen, so the line is held back until the overlay has opened up
 * again — delivered any earlier it plays out behind an opaque black hole. The
 * delay clears the peak hold plus the release (see ThemeTransitionOverlay), so it
 * lands as the screen comes back.
 */
const QUIPS = [
  'Your Black Hole can’t do anything to me',
  'I have been through worse horizons',
  'Nice singularity. You missed.',
  'Not so much as a redshift on me',
  'I orbit that thing for fun',
  'Tidal forces? Barely a stretch.',
  'My escape velocity is higher',
  'That is the third one today',
  'Took the photon ring on the way out',
  'Still here. Try a bigger one.',
];

/**
 * Lines are drawn without replacement: the bag is shuffled, emptied one line at a
 * time, and only refilled once every line has been used — so however many times
 * the theme is flipped, nothing repeats until all ten have been heard.
 *
 * Module-level rather than component state on purpose. The mark is mounted and
 * unmounted as play mode comes and goes and as screens change, and the run has to
 * survive that or the guarantee is worthless.
 */
let bag: string[] = [];
let lastQuip: string | null = null;

/**
 * The line for the eleventh flip. Ten comebacks in, the black hole finally lands
 * one: the mark gives it up, goes back to its slot in the header, and play mode
 * ends with it.
 */
const CONCESSION = 'You got me this time';

/** How many comebacks have been used out of the current run of ten. */
let spent = 0;

function nextQuip(): { text: string; concedes: boolean } {
  if (spent >= QUIPS.length) {
    // Beaten. Reset the run, so it starts from a full bag the next time it is
    // let out rather than conceding again immediately.
    spent = 0;
    bag = [];
    lastQuip = null;
    return { text: CONCESSION, concedes: true };
  }
  if (bag.length === 0) {
    bag = QUIPS.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = bag[i];
      bag[i] = bag[j];
      bag[j] = swap;
    }
    // Lines are taken off the end, so if a fresh bag would hand back the one that
    // just played, move it out of the way. The seam between two bags is the only
    // place a repeat could slip through.
    if (bag.length > 1 && bag[bag.length - 1] === lastQuip) {
      const swap = bag[bag.length - 1];
      bag[bag.length - 1] = bag[0];
      bag[0] = swap;
    }
  }
  lastQuip = bag.pop() ?? QUIPS[0];
  spent += 1;
  return { text: lastQuip, concedes: false };
}

const QUIP_DELAY_MS = 900;
const QUIP_HOLD_MS = 2400;
/** The last word is left up a little longer than the comebacks. */
const CONCESSION_HOLD_MS = 2800;
/** How long the walk of shame back to the header takes. */
const HOMECOMING_MS = 780;
const BUBBLE_WIDTH = 208;
const BUBBLE_GAP = 8;

/** How far a target may drift mid-approach before the grab is off. */
const SLIP_TOLERANCE = 44;
/** A target counts as reachable only if this much of it is on screen. */
const VISIBLE_MARGIN = 12;

/** Long enough to read the line, scaled to its length. */
function readingTime(text: string) {
  return Math.min(Math.max(1500 + text.length * 45, 2000), 5400);
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What it decided to do with something once it got there. */
type Intent = 'study' | 'poke' | 'tug';

/**
 * `measureInWindow` never fires for a node that has been detached, which would
 * leave the loop waiting forever, so every measurement is raced against a
 * deadline.
 */
function measure(ref: RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    let settled = false;
    const done = (rect: Rect | null) => {
      if (settled) return;
      settled = true;
      resolve(rect);
    };
    setTimeout(() => done(null), 120);
    node.measureInWindow((x, y, width, height) => {
      done(width === 0 && height === 0 ? null : { x, y, width, height });
    });
  });
}

/**
 * The brand mark, off its leash. It has two jobs, and never both at once.
 *
 * **Roaming** (play mode) it picks fights with whatever is on screen. It is not
 * running a script: each time it settles it measures what is actually there,
 * weighs the candidates against each other, and commits to one — how far it would
 * have to travel, how long since it last bothered that particular thing, how much
 * the screen says the thing is worth, plus enough noise that two runs never match.
 * Then it decides how far to take it — sizing something up without touching it, a
 * glancing poke, or a full tug of war — working its nerve up over several visits
 * rather than heaving at everything it passes.
 *
 * **Guiding** (a walkthrough) it drops the mischief and works through a screen's
 * steps in order, going to each one and saying its line.
 *
 * Either way targets are measured at the moment they are needed, so scrolling is
 * part of the world it reacts to rather than something that breaks it: things that
 * leave the viewport stop being candidates, a target that slides away
 * mid-approach is a grab that misses, and with nothing left to reach it goes to
 * the edge things went out of and peers after them.
 */
export function Mascot({
  playing,
  targets = NO_TARGETS,
  tour = null,
  onConcede,
  origin,
}: {
  playing?: boolean;
  targets?: MascotTarget[];
  tour?: MascotTour | null;
  /**
   * Called once the mark has conceded and walked back to its slot, for the screen
   * to end play mode with — by which point the mark is already sitting exactly
   * where its header logo lives, so the handover is not visible.
   */
  onConcede?: () => void;
  /**
   * The slot the real mark sits in when it is not out — the header logo's own
   * place. There is only ever one logo on screen: the screen hides the one in its
   * header while the mark is out, and the mark starts from exactly where it was
   * so the same object reads as having left its slot rather than a copy of it
   * appearing somewhere else.
   */
  origin?: RefObject<View | null>;
}) {
  const frameRef = useRef<View>(null);
  const [ready, setReady] = useState(false);
  /** What the bubble currently says; null once it has nothing to add. */
  const [say, setSay] = useState<string | null>(null);
  /** Set on the flip that finally gets it — see CONCESSION. */
  const [conceding, setConceding] = useState(false);
  // Read from the roaming loop's teardown, which must not wipe the last word.
  const concedingRef = useRef(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const tilt = useSharedValue(0);
  /** Dips negative through a hop, so it travels in an arc instead of a slide. */
  const lift = useSharedValue(0);
  /** Squashes before a leap. */
  const crouch = useSharedValue(0);
  /** Drives the speech bubble in and out. */
  const bubble = useSharedValue(0);
  /** Kept on the UI thread so the bubble can pick a side without a re-render. */
  const frameWidth = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const touring = !!tour && tour.running && tour.steps.length > 0;
  const onStage = (touring || !!playing || conceding) && !reducedMotion;

  /**
   * The walkthrough is read through a ref, and only its steps are a dependency of
   * the loop below.
   *
   * The screen that owns it rebuilds that object on every render, so depending on
   * its identity tore the loop down and started it again from the first step
   * every time anything on the screen re-rendered — which on the dashboard is
   * every 45ms while a gag is playing.
   */
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const steps = tour?.steps;

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    frameWidth.value = width;
    if (width > 0 && height > 0) setReady(true);
  }

  // Answers back when the theme is pulled out from under it — but only while it
  // is on screen, and never over the top of a walkthrough it is in the middle of.
  useEffect(() => {
    if (!playing || touring || reducedMotion) return;
    return onThemeFlipped(() => {
      const line = nextQuip();
      setSay(line.text);
      bubble.value = withDelay(
        QUIP_DELAY_MS,
        withSequence(
          withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.6)) }),
          withDelay(
            line.concedes ? CONCESSION_HOLD_MS : QUIP_HOLD_MS,
            withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
          )
        )
      );
      if (line.concedes) {
        concedingRef.current = true;
        setConceding(true);
      }
    });
  }, [playing, touring, reducedMotion, bubble]);

  // Beaten: it stops whatever it was doing, and while the overlay is still open it
  // makes its way back to the slot in the header it came out of. By the time the
  // last word has faded it is sitting exactly where its logo belongs, so handing
  // play mode back is invisible.
  useEffect(() => {
    if (!conceding) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Starts a touch before the line lands, so it is already moving when the
    // screen comes back rather than setting off after being spoken to.
    const setOff = Math.max(QUIP_DELAY_MS - 220, 0);

    (async () => {
      const [frame, slot] = await Promise.all([
        measure(frameRef),
        origin ? measure(origin) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (frame && slot) {
        const home = { x: slot.x - frame.x, y: slot.y - frame.y };
        x.value = withDelay(
          setOff,
          withTiming(home.x, { duration: HOMECOMING_MS, easing: Easing.inOut(Easing.cubic) })
        );
        y.value = withDelay(
          setOff,
          withTiming(home.y, { duration: HOMECOMING_MS, easing: Easing.inOut(Easing.cubic) })
        );
      }
      // The swagger goes out of it on the way.
      lift.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) });
      crouch.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) });
      tilt.value = withDelay(
        setOff,
        withTiming(0, { duration: HOMECOMING_MS, easing: Easing.out(Easing.quad) })
      );

      timer = setTimeout(() => {
        if (cancelled) return;
        concedingRef.current = false;
        setConceding(false);
        onConcede?.();
      }, QUIP_DELAY_MS + 260 + CONCESSION_HOLD_MS + 320);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [conceding, origin, onConcede, x, y, tilt, lift, crouch]);

  useEffect(() => {
    if (!ready || reducedMotion) return;
    // Nothing to pick a fight with once it has conceded.
    if (conceding) return;
    if (!touring && !(playing && targets.length > 0)) return;

    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });

    /** Where it would stand to get hold of something, in overlay coordinates. */
    function approach(target: Rect, frame: Rect) {
      const localX = target.x - frame.x;
      const localY = target.y - frame.y;
      // Stands off whichever side has the room, level with the middle of it.
      const leftRoom = localX - SIZE;
      const rightRoom = frame.width - (localX + target.width) - SIZE;
      const standX = rightRoom > leftRoom ? localX + target.width + 6 : localX - SIZE - 6;
      const standY = localY + target.height / 2 - SIZE / 2;
      return {
        x: Math.max(8, Math.min(standX, Math.max(frame.width - SIZE - 8, 8))),
        y: Math.max(4, Math.min(standY, Math.max(frame.height - SIZE - 4, 4))),
      };
    }

    function onScreen(target: Rect, frame: Rect) {
      const localY = target.y - frame.y;
      return localY + target.height > VISIBLE_MARGIN && localY < frame.height - VISIBLE_MARGIN;
    }

    async function leapTo(to: { x: number; y: number }, duration = HOP_MS) {
      const towards = Math.sign(to.x - x.value) || 1;
      // Turns towards what it picked, gathers itself, then goes.
      tilt.value = withTiming(towards * 0.55, { duration: 200, easing: Easing.out(Easing.quad) });
      await sleep(THINK_MS);
      if (cancelled) return;
      crouch.value = withSequence(
        withTiming(1, { duration: CROUCH_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: duration * 0.35, easing: Easing.out(Easing.quad) })
      );
      await sleep(CROUCH_MS);
      if (cancelled) return;
      const span = Math.hypot(to.x - x.value, to.y - y.value);
      lift.value = withSequence(
        withTiming(-Math.min(span * 0.3, 46), {
          duration: duration / 2,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, { duration: duration / 2, easing: Easing.in(Easing.quad) })
      );
      tilt.value = withSequence(
        withTiming(towards * 0.9, { duration: duration / 2, easing: Easing.out(Easing.quad) }),
        withTiming(towards * 0.2, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
      );
      x.value = withTiming(to.x, { duration, easing: Easing.inOut(Easing.cubic) });
      y.value = withTiming(to.y, { duration, easing: Easing.inOut(Easing.cubic) });
      await sleep(duration);
    }

    /**
     * Puts the mark where the real logo was before it makes a move, so it leaves
     * its slot instead of materialising mid-screen.
     */
    async function enter() {
      if (!origin) return;
      const [frame, slot] = await Promise.all([measure(frameRef), measure(origin)]);
      if (cancelled || !frame || !slot) return;
      x.value = slot.x - frame.x;
      y.value = slot.y - frame.y;
    }

    /** Rocks in place, so it never looks parked while it is thinking. */
    function idleSway(towards = 0) {
      tilt.value = withSequence(
        withTiming(towards * 0.4 + 0.3, { duration: 560, easing: Easing.inOut(Easing.quad) }),
        withTiming(towards * 0.4 - 0.3, { duration: 560, easing: Easing.inOut(Easing.quad) })
      );
    }

    function showBubble(text: string) {
      setSay(text);
      bubble.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.5)) });
    }

    function hideBubble() {
      bubble.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) });
    }

    async function haul(pull: { dx: number; dy: number }) {
      const fromX = x.value;
      const fromY = y.value;
      const envelope = (origin: number, delta: number) =>
        withSequence(
          withTiming(origin + delta, { duration: YANK_MS, easing: Easing.out(Easing.quad) }),
          // Loses ground — the thing pulls back.
          withTiming(origin + delta * 0.4, { duration: GIVE_MS, easing: Easing.inOut(Easing.quad) }),
          withTiming(origin + delta * 1.25, { duration: HEAVE_MS, easing: Easing.out(Easing.quad) }),
          withDelay(
            HOLD_MS,
            withTiming(origin, { duration: RELEASE_MS, easing: Easing.inOut(Easing.quad) })
          )
        );
      x.value = envelope(fromX, pull.dx);
      y.value = envelope(fromY, pull.dy);
      const strain = Math.sign(pull.dx) || 1;
      tilt.value = withSequence(
        withTiming(strain * 1.4, { duration: YANK_MS, easing: Easing.out(Easing.quad) }),
        withTiming(strain * 0.5, { duration: GIVE_MS, easing: Easing.inOut(Easing.quad) }),
        withTiming(strain * 1.8, { duration: HEAVE_MS + HOLD_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: RELEASE_MS, easing: Easing.inOut(Easing.quad) })
      );
      await sleep(TUG_MS);
    }

    /** Whatever it was going for got away — recoil, and think again. */
    async function loseGrip() {
      const back = -(Math.sign(tilt.value) || 1);
      x.value = withTiming(x.value + back * 16, { duration: 220, easing: Easing.out(Easing.quad) });
      tilt.value = withSequence(
        withTiming(back * 1.6, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(back * 0.2, { duration: 420, easing: Easing.inOut(Easing.quad) })
      );
      await sleep(520);
    }

    /**
     * Works through the screen's steps in order, saying its piece at each.
     *
     * A step whose element has gone — a card for data the screen does not have,
     * a control behind a collapsed section — is skipped rather than pointed at
     * from across the screen, so a half-empty screen gives a shorter tour instead
     * of a wrong one.
     */
    async function guide() {
      await enter();
      const walkthrough = tourRef.current;
      for (const step of walkthrough?.steps ?? []) {
        if (cancelled) return;
        await walkthrough?.reveal?.(step.ref);
        if (cancelled) return;

        const [frame, rect] = await Promise.all([measure(frameRef), measure(step.ref)]);
        if (cancelled) return;
        if (!frame || !rect || !onScreen(rect, frame)) continue;

        await leapTo(approach(rect, frame));
        if (cancelled) return;
        idleSway(1);
        showBubble(step.text);
        await sleep(readingTime(step.text));
        if (cancelled) return;
        hideBubble();
        await sleep(320);
      }
      if (!cancelled) tourRef.current?.onDone();
    }

    /** When it last bothered each target, so it does not fixate on one thing. */
    const lastVisit = new Map<MascotTarget, number>();
    let previous: MascotTarget | null = null;
    /**
     * Rises while it only looks and prods, and empties when it finally heaves.
     * This is what makes it build up to a tug instead of arriving at full force.
     */
    let nerve = 0;

    async function decide() {
      const frame = await measure(frameRef);
      if (cancelled || !frame) return;

      const measured = await Promise.all(targets.map((target) => measure(target.ref)));
      if (cancelled) return;

      const now = Date.now();
      const span = Math.hypot(frame.width, frame.height);
      const candidates: {
        target: MascotTarget;
        rect: Rect;
        score: number;
        /** Has no wobble to give — the full gag is the only thing it can do. */
        gagOnly: boolean;
      }[] = [];
      const gone: { target: MascotTarget; rect: Rect }[] = [];

      measured.forEach((rect, i) => {
        const target = targets[i];
        if (!rect) return;
        if (!onScreen(rect, frame)) {
          gone.push({ target, rect });
          return;
        }
        const stand = approach(rect, frame);
        const gap = Math.hypot(stand.x - x.value, stand.y - y.value);
        // Prefers a hop worth making: not landing on top of itself, not lunging
        // the whole height of the screen either.
        const travel = 1 - Math.min(Math.abs(gap / span - 0.34) / 0.66, 1);
        const idle = now - (lastVisit.get(target) ?? -Infinity);
        const novelty = Math.min(idle / 14000, 1);
        const score =
          (target.appeal ?? 0.5) * 1.1 +
          travel * 0.8 +
          novelty * 1.2 +
          Math.random() * 0.7 -
          (target === previous ? 1.4 : 0);
        candidates.push({
          target,
          rect,
          score,
          gagOnly: !target.nudge && !!target.onArrive,
        });
      });

      if (candidates.length === 0) {
        // Everything it cares about has been scrolled away. Go to the edge they
        // went out of and peer after them rather than yanking at nothing.
        const chase = gone[0];
        const above = chase ? chase.rect.y - frame.y < 0 : true;
        await leapTo(
          {
            x: Math.max(
              8,
              Math.min(x.value + (Math.random() - 0.5) * 90, Math.max(frame.width - SIZE - 8, 8))
            ),
            y: above ? 6 : Math.max(frame.height - SIZE - 6, 6),
          },
          520
        );
        if (cancelled) return;
        idleSway(above ? -0.5 : 0.5);
        await sleep(900 + Math.random() * 700);
        return;
      }

      // Settled before the target is picked, because it changes what is worth
      // going to. The donut and the bars answer only with their gag, which is
      // written to run over the length of a full heave — prodding one would play
      // nothing at all, so on a turn it has not worked itself up to they are not
      // candidates. Better it bothers something that can wobble back.
      const wantsTug = nerve + Math.random() * 0.35 > 0.7;
      const eligible = wantsTug ? candidates : candidates.filter((c) => !c.gagOnly);
      // Unless they are all that is on screen, in which case it commits rather
      // than hop over and do nothing.
      const shortlist = eligible.length > 0 ? eligible : candidates;
      shortlist.sort((a, b) => b.score - a.score);
      const { target, rect, gagOnly } = shortlist[0];

      // How far to take it. Nothing to haul means there is nothing to haul, and
      // otherwise it works up to a heave over a few visits.
      let intent: Intent;
      if (!target.pull) {
        intent = lastVisit.has(target) ? 'poke' : 'study';
      } else if (wantsTug || gagOnly) {
        intent = 'tug';
      } else {
        intent = lastVisit.has(target) ? 'poke' : 'study';
      }

      await leapTo(approach(rect, frame));
      if (cancelled) return;

      // It has arrived — but the page may have moved under it on the way over.
      const landed = await measure(target.ref);
      const frameNow = await measure(frameRef);
      if (cancelled) return;
      if (
        !landed ||
        !frameNow ||
        !onScreen(landed, frameNow) ||
        Math.hypot(landed.x - rect.x, landed.y - rect.y) > SLIP_TOLERANCE
      ) {
        previous = target;
        await loseGrip();
        return;
      }

      previous = target;
      lastVisit.set(target, Date.now());

      if (intent === 'study') {
        // Sizes it up without laying a horn on it, and leaves wanting more.
        idleSway(1);
        nerve += 0.45;
        await sleep(760 + Math.random() * 520);
        return;
      }

      if (target.nudge) {
        const force = intent === 'tug' ? 1 : 0.45;
        target.nudge.value = withSequence(
          withTiming(force, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 560, easing: Easing.inOut(Easing.quad) })
        );
      }

      if (intent === 'poke') {
        tilt.value = withSequence(
          withTiming(1.3, { duration: 170, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) })
        );
        nerve += 0.3;
        await sleep(660 + Math.random() * 420);
        return;
      }

      // A full heave, and the gag that goes with it.
      target.onArrive?.();
      nerve = 0;
      await haul(target.pull!);
      if (cancelled) return;
      // Blown out after that one.
      await sleep(420 + Math.random() * 480);
    }

    async function roam() {
      await enter();
      // A beat to look around before the first move.
      idleSway();
      await sleep(500);
      while (!cancelled) {
        await decide();
        // A decision that measured nothing returns straight away, so this is
        // what keeps the loop off the JS thread's back until there is something
        // on screen to measure again.
        await sleep(120);
      }
    }

    if (touring) {
      guide();
    } else {
      roam();
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
      // Left alone while conceding: the homecoming owns the mark's motion from
      // here, and clearing the bubble would cut off its last word.
      if (concedingRef.current) return;
      tilt.value = withTiming(0, { duration: 200 });
      lift.value = withTiming(0, { duration: 200 });
      crouch.value = withTiming(0, { duration: 200 });
      bubble.value = withTiming(0, { duration: 200 });
    };
    // `tour` is read through the closure; only its identity and running flag
    // should restart the loop, not every render of the screen that owns it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // `tourRef` is deliberately absent: see the note on its declaration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, touring, conceding, reducedMotion, ready, targets, steps, origin, x, y, tilt, lift, crouch, bubble]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + lift.value },
      { rotate: `${tilt.value * 9}deg` },
      { scaleY: 1 - crouch.value * 0.16 },
      { scaleX: 1 + crouch.value * 0.12 },
    ],
  }));

  // Rides along on position alone — none of the leaning or squashing, so the text
  // stays level however the mark is throwing itself about. Flips to the mark's
  // other side rather than running off the edge of the screen.
  const bubbleStyle = useAnimatedStyle(() => {
    const overhangs = x.value + SIZE + BUBBLE_GAP + BUBBLE_WIDTH > frameWidth.value;
    return {
      opacity: bubble.value,
      transform: [
        {
          translateX: overhangs
            ? Math.max(x.value - BUBBLE_WIDTH - BUBBLE_GAP, 4)
            : x.value + SIZE + BUBBLE_GAP,
        },
        { translateY: y.value + lift.value - 10 },
        { scale: 0.88 + bubble.value * 0.12 },
      ],
    };
  });

  return (
    <View ref={frameRef} collapsable={false} style={{ flex: 1 }} onLayout={onLayout}>
      {onStage ? (
        <>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, style]}>
            <BrandMark size={SIZE} />
          </Animated.View>
          {say ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: BUBBLE_WIDTH,
                  paddingHorizontal: 11,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.card,
                },
                bubbleStyle,
              ]}
            >
              <Text
                variant="mono"
                style={{ fontSize: 10, lineHeight: 15, color: colors.textPrimary }}
              >
                {say}
              </Text>
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
