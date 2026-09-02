import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSettings } from '../../hooks/useSettings';
import { applyColorTheme, colors, type ThemeMode } from '../../theme';
import { LockScreen } from './LockScreen';

interface AppGateProps {
  onThemeModeChange: (mode: ThemeMode) => void;
  children: (remountKey: string) => ReactNode;
}

/**
 * Sits inside the SQLite/QueryClient providers (where `useSettings` works) and
 * handles the two things that must happen before the real app renders:
 *  - sync the mutable `colors` object to the persisted theme and tell App.tsx
 *    the active mode, so GluestackUIProvider/StatusBar/navigationTheme follow it
 *  - gate all content behind a biometric unlock when the user has turned that on
 */
export function AppGate({ onThemeModeChange, children }: AppGateProps) {
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
  }

  useEffect(() => {
    if (settings) onThemeModeChange(settings.theme_mode);
  }, [settings, onThemeModeChange]);

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

  return <>{children(settings.theme_mode)}</>;
}
