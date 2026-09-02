import { createContext, useContext, type ReactNode } from 'react';
import type { ThemeMode } from './colors';

const ThemeModeContext = createContext<ThemeMode>('dark');

export function ThemeModeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  return <ThemeModeContext.Provider value={mode}>{children}</ThemeModeContext.Provider>;
}

/**
 * Subscribes a component to theme changes, and returns the active mode.
 *
 * `colors` is mutated in place, so reading `colors.x` in an inline style already
 * yields the new palette on any re-render — the missing half is something to
 * *trigger* that re-render. This used to be done by remounting the entire
 * navigation tree via a `key`, which cost ~700ms and was itself the flicker the
 * theme transition had to hide.
 *
 * Children re-render along with their parent, so only the top of each subtree
 * that builds `colors`-styled elements needs to call this: the screens, and the
 * two navigators (which own the tab bar and screen options, and so are not
 * re-rendered by any screen).
 */
export function useThemeRepaint(): ThemeMode {
  return useContext(ThemeModeContext);
}
