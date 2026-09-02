import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AccountsScreen } from '../screens/AccountsScreen';
import { BillsScreen } from '../screens/BillsScreen';
import { BudgetProfilesScreen } from '../screens/BudgetProfilesScreen';
import { BudgetSetupScreen } from '../screens/BudgetSetupScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { CategoryManagementScreen } from '../screens/CategoryManagementScreen';
import { DebtsScreen } from '../screens/DebtsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { MasterDataScreen } from '../screens/MasterDataScreen';
import { useActiveProfile } from '../hooks/useProfiles';
import { colors } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
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
      initialRouteName={needsOnboarding ? 'BudgetSetup' : 'MainTabs'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="BudgetSetup"
        component={BudgetSetupScreen}
        initialParams={{ mode: needsOnboarding ? 'onboarding' : 'newMonth' }}
      />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="BudgetProfiles" component={BudgetProfilesScreen} />
      <Stack.Screen name="MasterData" component={MasterDataScreen} />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="Debts" component={DebtsScreen} />
      <Stack.Screen name="Bills" component={BillsScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
    </Stack.Navigator>
  );
}
