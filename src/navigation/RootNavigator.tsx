import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { BudgetSetupScreen } from '../screens/BudgetSetupScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { CategoryManagementScreen } from '../screens/CategoryManagementScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { useSettings } from '../hooks/useSettings';
import { colors } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { data: settings, isLoading } = useSettings();

  // `initialRouteName` is only read once, on first mount — it must not be computed
  // from settings before that query has actually resolved, or the navigator gets
  // permanently seeded onto the onboarding screen on every cold start.
  if (isLoading || !settings) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const onboarded = settings.onboarded === 1;

  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'MainTabs' : 'BudgetSetup'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="BudgetSetup"
        component={BudgetSetupScreen}
        initialParams={{ mode: onboarded ? 'newMonth' : 'onboarding' }}
      />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
    </Stack.Navigator>
  );
}
