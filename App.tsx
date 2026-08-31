import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SQLiteProvider } from 'expo-sqlite';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Suspense } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DB_NAME, migrateDbIfNeeded } from './src/db/client';
import { seedDefaultCategoriesIfEmpty } from './src/db/repositories/categories';
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
  await seedDefaultCategoriesIfEmpty(db);
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

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider databaseName={DB_NAME} onInit={onInit} useSuspense>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer theme={navigationTheme}>
                <RootNavigator />
              </NavigationContainer>
            </QueryClientProvider>
          </SQLiteProvider>
        </Suspense>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
