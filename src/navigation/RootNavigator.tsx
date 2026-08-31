import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BudgetSetupScreen } from '../screens/BudgetSetupScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { useSettings } from '../hooks/useSettings';
import { colors } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { data: settings } = useSettings();
  const onboarded = settings?.onboarded === 1;

  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'MainTabs' : 'BudgetSetup'}
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="BudgetSetup"
        component={BudgetSetupScreen}
        initialParams={{ mode: onboarded ? 'newMonth' : 'onboarding' }}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
    </Stack.Navigator>
  );
}
