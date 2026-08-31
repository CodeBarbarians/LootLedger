import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, fontFamily, fontSize } from '../theme';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabDot({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 5,
        height: 5,
        borderRadius: 3,
        marginBottom: 4,
        backgroundColor: focused ? colors.accent : 'transparent',
      }}
    />
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
