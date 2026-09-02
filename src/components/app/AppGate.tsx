import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { useSettings } from '../../hooks/useSettings';
import { applyColorTheme, colors, ThemeModeProvider, type ThemeMode } from '../../theme';
import { LockScreen } from './LockScreen';
import { notifyThemePainted } from './themeTransition';

interface AppGateProps {
  children: ReactNode;
}

/**
 * Sits inside the SQLite/QueryClient providers (where `useSettings` works) and
 * handles the two things that must happen before the real app renders:
 *  - apply the persisted theme — the mutable `colors` object, the colour scheme
 *    NativeWind reads, and the context that re-renders everything styled from
 *    them — all in one commit, and report when it has painted
 *  - gate all content behind a biometric unlock when the user has turned that on
 */
export function AppGate({ children }: AppGateProps) {
  const { data: settings } = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const lastAppliedMode = useRef<ThemeMode | null>(null);

  // Mutate the shared `colors` object synchronously during render (not in an
  // effect) so this same render pass — including the LockScreen/children below
  // — already reads the correct values instead of flashing the previous theme
  // for one frame. Idempotent, so StrictMode's double-render is harmless.
  if (settings && settings.theme_mode !== lastAppliedMode.current) {
    lastAppliedMode.current = settings.theme_mode;
    applyColorTheme(settings.theme_mode);
    // NativeWind resolves its className colours from Appearance's colour scheme, so
    // that has to flip in this same commit. Left to GluestackUIProvider's `mode`
    // prop it lands a frame or two later — every className-styled surface then
    // repaints after the inline `colors` ones, which reads as the theme flicker.
    Appearance.setColorScheme(settings.theme_mode);
  }

  const mode = settings?.theme_mode;

  // Tell the theme transition when the new theme is on screen, so it can hold its
  // cover until then instead of guessing a duration. This effect runs after the
  // commit, and the frame callback lands once that commit has been drawn.
  useEffect(() => {
    if (!mode) return;
    const frame = requestAnimationFrame(notifyThemePainted);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  if (!settings) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (settings.biometric_lock_enabled && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  // Provided from here rather than App.tsx so subscribers re-render in the same
  // commit that applies the palette above, instead of a render later.
  return <ThemeModeProvider mode={settings.theme_mode}>{children}</ThemeModeProvider>;
}
