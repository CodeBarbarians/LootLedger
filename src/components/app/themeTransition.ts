import { makeImageFromView, type SkImage } from '@shopify/react-native-skia';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { getPalette, type ThemeMode } from '../../theme';

/**
 * Drives the black-hole theme transition.
 *
 * The animation has to outlive the thing that triggers it: switching `theme_mode`
 * remounts the whole navigation tree (see AppGate), so a toggle button cannot own
 * the animation — it would be unmounted halfway through. Instead the overlay lives
 * at the app root and subscribes here, and any button anywhere just publishes a
 * "job" describing where the singularity is and what to switch to.
 *
 * The theme mutation itself is deliberately deferred to the job's `onPeak`, which
 * the overlay fires when the screen is fully collapsed into the singularity — so
 * the remount happens while the overlay is opaque and is never seen.
 */
export interface ThemeTransitionJob {
  runId: number;
  /** Snapshot of the outgoing theme, taken the instant the button was pressed. */
  image: SkImage;
  /** Singularity position, in dp, relative to the snapshotted container. */
  origin: { x: number; y: number };
  size: { width: number; height: number };
  /** Background of the theme being switched *to*, as linear rgb 0..1. */
  incoming: [number, number, number];
  accent: [number, number, number];
  accentHex: string;
  onPeak: () => void;
  onDone: () => void;
}

/**
 * Hard ceiling on how long the overlay may stay up if its timeline is interrupted.
 * Must stay clear of the animation's own duration, or it cancels the very thing it
 * is meant to clean up after.
 */
const SAFETY_TIMEOUT_MS = 6000;

let snapshotTarget: RefObject<View | null> | null = null;
let subscriber: ((job: ThemeTransitionJob | null) => void) | null = null;
let running = false;
let nextRunId = 1;

/** Registered by App.tsx — the view that gets snapshotted and animated. */
export function setThemeTransitionTarget(ref: RefObject<View | null> | null) {
  snapshotTarget = ref;
}

export function subscribeThemeTransition(fn: (job: ThemeTransitionJob | null) => void) {
  subscriber = fn;
  return () => {
    if (subscriber === fn) subscriber = null;
  };
}

function measureInWindow(ref: RefObject<View | null>) {
  return new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
    const node = ref.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace('#', ''), 16);
  return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}

/**
 * Runs the transition and applies the theme at its peak. Falls back to applying
 * the theme immediately if the effect can't run (no snapshot, no overlay mounted),
 * so a failure costs the animation, never the setting itself.
 *
 * @param buttonRef the tapped control — the effect originates from its center
 * @param toMode the mode being switched to
 * @param applyTheme persists the change; called at the peak of the animation
 */
export async function runThemeTransition(
  buttonRef: RefObject<View | null>,
  toMode: ThemeMode,
  applyTheme: () => void
) {
  // Overlapping runs would fight over one shared overlay, and the second snapshot
  // would capture the first animation mid-flight.
  if (running) return;

  const target = snapshotTarget;
  const publish = subscriber;
  if (!target || !publish) {
    applyTheme();
    return;
  }

  running = true;
  let image: SkImage | null = null;
  let container: { x: number; y: number; width: number; height: number } | null = null;
  let button: { x: number; y: number; width: number; height: number } | null = null;

  try {
    [button, container] = await Promise.all([measureInWindow(buttonRef), measureInWindow(target)]);
    if (container && container.width > 0 && container.height > 0) {
      image = await makeImageFromView(target as RefObject<never>);
    }
  } catch {
    image = null;
  }

  if (!image || !container) {
    running = false;
    applyTheme();
    return;
  }

  const palette = getPalette(toMode);
  const capturedImage = image;
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(safety);
    running = false;
    publish(null);
    // Unmounting the overlay is a React state update, so the canvas can still
    // paint a frame after this returns — freeing the image inline would pull it
    // out from under that frame.
    setTimeout(() => capturedImage.dispose(), 250);
  };
  const safety = setTimeout(finish, SAFETY_TIMEOUT_MS);

  publish({
    runId: nextRunId++,
    image: capturedImage,
    origin: button
      ? {
          x: button.x + button.width / 2 - container.x,
          y: button.y + button.height / 2 - container.y,
        }
      : { x: container.width / 2, y: container.height / 2 },
    size: { width: container.width, height: container.height },
    incoming: rgb(palette.background),
    accent: rgb(palette.accent),
    accentHex: palette.accent,
    onPeak: applyTheme,
    onDone: finish,
  });
}
