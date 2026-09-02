import '@/global.css';

import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
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
import { Suspense } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Spinner } from '@/components/ui/spinner';
import { View } from '@/components/ui/view';
import { ToastProvider } from './src/components/app/Toast';
import { DB_NAME, migrateDbIfNeeded } from './src/db/client';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const queryClient = new QueryClient();

const navigationTheme: Theme = {
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

async function onInit(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode="dark">
        <SafeAreaProvider>
          {!fontsLoaded ? (
            <LoadingScreen />
          ) : (
            <Suspense fallback={<LoadingScreen />}>
              <SQLiteProvider databaseName={DB_NAME} onInit={onInit} useSuspense>
                <QueryClientProvider client={queryClient}>
                  <ToastProvider>
                    <NavigationContainer theme={navigationTheme}>
                      <RootNavigator />
                    </NavigationContainer>
                  </ToastProvider>
                </QueryClientProvider>
              </SQLiteProvider>
            </Suspense>
          )}
          <StatusBar style="light" />
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
