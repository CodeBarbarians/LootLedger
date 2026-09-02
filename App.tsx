import '@/global.css';

import {
  DarkTheme,
  NavigationContainer,
  type NavigationState,
  type Theme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SQLiteProvider } from 'expo-sqlite';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Component, Suspense, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Spinner } from '@/components/ui/spinner';
import { View } from '@/components/ui/view';
import { AppGate } from './src/components/app/AppGate';
import { ToastProvider } from './src/components/app/Toast';
import { DB_NAME, migrateDbIfNeeded } from './src/db/client';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors, type ThemeMode } from './src/theme';

// TEMP DIAGNOSTIC — remove once the blank-screen-on-launch bug is found.
class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.log(`[StartupErrorBoundary] caught: ${error.message}\n${info.componentStack}`);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#000' }}
          contentContainerStyle={{ padding: 24, paddingTop: 60 }}
        >
          <Text style={{ color: '#FF5A1F', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
            Startup error
          </Text>
          <Text style={{ color: '#fff', fontSize: 12 }} selectable>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

// Recomputed fresh in App() on every render (not a module-level constant) since
// `colors` is a mutated-in-place object — reading it here at module scope would
// permanently freeze the theme at whatever it was on first import.
function buildNavigationTheme(): Theme {
  return {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.background,
      border: colors.border,
      primary: colors.accent,
      text: colors.textPrimary,
    },
  };
}

async function onInit(db: SQLiteDatabase) {
  // TEMP DIAGNOSTIC — remove once the blank-screen-on-launch bug is found.
  // If migration hangs on a blocked native call, this timer still fires (the JS
  // thread is free), so we get a clear log line instead of permanent silence.
  const hangTimer = setTimeout(() => {
    console.log('[onInit] STILL RUNNING AFTER 10s — migration appears hung');
  }, 10000);
  try {
    console.log('[onInit] calling migrateDbIfNeeded');
    await migrateDbIfNeeded(db);
    console.log('[onInit] migrateDbIfNeeded resolved successfully');
  } catch (error) {
    console.log(
      `[onInit] migrateDbIfNeeded threw: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error ? error.stack : ''}`
    );
    throw error;
  } finally {
    clearTimeout(hangTimer);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  // A theme change remounts NavigationContainer below (see AppGate) so every
  // screen re-reads the mutated `colors` object instead of keeping stale
  // inline styles. That remount would otherwise reset navigation back to the
  // initial route, so the last known state is captured here and fed back in
  // as `initialState` — this ref outlives the remount since it's owned by
  // this parent component, not the subtree being torn down.
  const navStateRef = useRef<NavigationState | undefined>(undefined);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode={themeMode}>
        <SafeAreaProvider>
          {!fontsLoaded ? (
            <LoadingScreen />
          ) : (
            <StartupErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <SQLiteProvider databaseName={DB_NAME} onInit={onInit} useSuspense>
                  <QueryClientProvider client={queryClient}>
                    <ToastProvider>
                      <AppGate onThemeModeChange={setThemeMode}>
                        {(remountKey) => (
                          <NavigationContainer
                            key={remountKey}
                            theme={buildNavigationTheme()}
                            initialState={navStateRef.current}
                            onStateChange={(state) => {
                              navStateRef.current = state;
                            }}
                          >
                            <RootNavigator />
                          </NavigationContainer>
                        )}
                      </AppGate>
                    </ToastProvider>
                  </QueryClientProvider>
                </SQLiteProvider>
              </Suspense>
            </StartupErrorBoundary>
          )}
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        </SafeAreaProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Spinner color={colors.accent} />
    </View>
  );
}
