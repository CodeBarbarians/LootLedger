import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BudgetSetupScreen } from '../screens/BudgetSetupScreen';
import { useActiveProfile } from '../hooks/useProfiles';
import { colors, useThemeRepaint } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { OuterStackParamList } from './types';

const Stack = createNativeStackNavigator<OuterStackParamList>();

export function RootNavigator() {
  useThemeRepaint();
  const { isLoading, needsOnboarding } = useActiveProfile();

  // `initialRouteName` is only read once, on first mount — it must not be computed
  // from the active profile before that query has actually resolved, or the navigator
  // gets permanently seeded onto the onboarding screen on every cold start.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={needsOnboarding ? 'Onboarding' : 'MainTabs'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      {/* The only screen outside the tabs: first-run setup must not hand the user
          a tab bar to escape through before a budget profile exists. The cast is
          because this same screen is also registered inside the tabs, where its
          navigation prop is typed against the in-tab stack. */}
      <Stack.Screen
        name="Onboarding"
        component={BudgetSetupScreen as unknown as ComponentType}
        initialParams={{ mode: 'onboarding' }}
      />
    </Stack.Navigator>
  );
}
