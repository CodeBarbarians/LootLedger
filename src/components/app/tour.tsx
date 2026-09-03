import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';

/**
 * One beat of a screen's walkthrough: something on the screen, and what the
 * mascot has to say about it.
 *
 * The element is handed over as a ref rather than a position for the same reason
 * the mascot's roaming targets are — it is measured when it is needed, so the
 * tour survives the page being scrolled and skips anything that has since gone.
 */
export interface TourStep {
  ref: RefObject<View | null>;
  text: string;
}

/** Every screen that has a walkthrough. Doubles as the key stored in settings. */
export type TourKey =
  | 'Dashboard'
  | 'BudgetSetup'
  | 'History'
  | 'HistoryDetail'
  | 'Data'
  | 'Settings'
  | 'CategoryDetail'
  | 'CategoryManagement'
  | 'BudgetProfiles'
  | 'MasterData'
  | 'Accounts'
  | 'Debts'
  | 'Bills'
  | 'Goals';

export interface ScreenTour {
  steps: TourStep[];
  running: boolean;
  /** Replays it from the top — what the `?` control calls. */
  start: () => void;
  finish: () => void;
}

/**
 * Whether a walkthrough is on screen anywhere, as a module-level signal.
 *
 * The dashboard's play mode has a mascot of its own, and two marks on screen at
 * once reads as a bug rather than a feature, so it stands down while a tour is
 * running. A module-level store rather than context because the two live in
 * different subtrees — `Screen` owns the tour, the dashboard owns play mode.
 */
let running = false;
const runningListeners = new Set<(value: boolean) => void>();

function setTourRunning(value: boolean) {
  if (running === value) return;
  running = value;
  runningListeners.forEach((listener) => listener(value));
}

export function useTourRunning() {
  const [value, setValue] = useState(running);
  useEffect(() => {
    runningListeners.add(setValue);
    setValue(running);
    return () => {
      runningListeners.delete(setValue);
    };
  }, []);
  return value;
}

function parseSeen(raw: string | undefined): TourKey[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as TourKey[]) : [];
  } catch {
    // A malformed column should cost the user a repeated walkthrough, nothing more.
    return [];
  }
}

/** How long the screen is given to settle before the first step is measured. */
const SETTLE_MS = 650;

/**
 * Registers a screen's walkthrough and decides when it plays.
 *
 * It runs itself once per screen — the first time that screen is opened — and is
 * available on demand from the `?` control after that. The screen is marked as
 * seen the moment it starts rather than when it ends, so a walkthrough that gets
 * abandoned halfway does not ambush the user again on their next visit.
 *
 * Only the focused screen may start one. Every tab keeps its whole stack mounted,
 * so without that check a screen the user has never actually looked at would play
 * its tour to nobody and mark itself seen.
 */
export function useScreenTour(key: TourKey, steps: TourStep[]): ScreenTour {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const isFocused = useIsFocused();
  const [runningHere, setRunningHere] = useState(false);
  // Guards against a second auto-start while the write of the first is in flight.
  const autoStarted = useRef(false);

  const seen = useMemo(() => parseSeen(settings?.tours_seen), [settings?.tours_seen]);

  const markSeen = useCallback(() => {
    if (seen.includes(key)) return;
    updateSettings.mutate({ tours_seen: JSON.stringify([...seen, key]) });
  }, [key, seen, updateSettings]);

  const start = useCallback(() => {
    if (steps.length === 0) return;
    setRunningHere(true);
    setTourRunning(true);
  }, [steps.length]);

  const finish = useCallback(() => {
    setRunningHere(false);
    setTourRunning(false);
  }, []);

  useEffect(() => {
    if (!settings || !isFocused || autoStarted.current) return;
    if (steps.length === 0 || seen.includes(key)) return;
    autoStarted.current = true;
    markSeen();
    const timer = setTimeout(start, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [settings, isFocused, steps.length, seen, key, markSeen, start]);

  // Leaving the screen mid-walkthrough ends it rather than leaving the signal
  // stuck on, which would keep play mode suppressed for the rest of the session.
  useEffect(() => {
    if (isFocused) return;
    setRunningHere(false);
    setTourRunning(false);
  }, [isFocused]);

  useEffect(() => () => setTourRunning(false), []);

  return { steps, running: runningHere && isFocused, start, finish };
}
