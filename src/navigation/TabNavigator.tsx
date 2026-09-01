import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { DataScreen } from '../screens/DataScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { colors, fontFamily } from '../theme';
import type { MainTabsParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabDot({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 2,
        marginBottom: 4,
        backgroundColor: focused ? colors.accent : 'transparent',
      }}
    />
  );
}

/** Never actually renders — the Budget tab press is intercepted below and pushed onto the root stack instead. */
function BudgetPlaceholder() {
  return <View className="flex-1 bg-background" />;
}

export function TabNavigator() {
  const { data: currentPeriod } = useCurrentPeriod();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 11,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.mono,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1,
        },
        tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'HOME' }} />
      <Tab.Screen
        name="Budget"
        component={BudgetPlaceholder}
        options={{ tabBarLabel: 'BUDGET' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
            if (currentPeriod) {
              parent?.navigate('BudgetSetup', { mode: 'edit', periodId: currentPeriod.id });
            } else {
              parent?.navigate('BudgetSetup', { mode: 'newMonth' });
            }
          },
        })}
      />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'HISTORY' }} />
      <Tab.Screen name="Data" component={DataScreen} options={{ tabBarLabel: 'DATA' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'MORE' }} />
    </Tab.Navigator>
  );
}
