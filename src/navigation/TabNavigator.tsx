import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountsScreen } from '../screens/AccountsScreen';
import { BillsScreen } from '../screens/BillsScreen';
import { BudgetProfilesScreen } from '../screens/BudgetProfilesScreen';
import { BudgetSetupScreen } from '../screens/BudgetSetupScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { CategoryManagementScreen } from '../screens/CategoryManagementScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { DataScreen } from '../screens/DataScreen';
import { DebtsScreen } from '../screens/DebtsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { MasterDataScreen } from '../screens/MasterDataScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useActiveProfile } from '../hooks/useProfiles';
import { colors, fontFamily, useThemeRepaint } from '../theme';
import type { MainTabsParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The bar's own content box, before the system's bottom inset is added on.
 *
 * This has to be added to the inset by hand: a numeric `height` in `tabBarStyle`
 * is returned verbatim by the navigator's own `getTabBarHeight`, insets and all
 * skipped, while it still pads the bar by `insets.bottom` underneath. A fixed
 * height therefore has the system bar eat into the labels rather than sit below
 * them — barely noticeable under gesture navigation's ~19dp, and enough to crush
 * the row under three-button navigation's 48dp.
 */
const TAB_BAR_CONTENT_HEIGHT = 62;

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

/**
 * Every in-app screen, registered once and instantiated per tab with a different
 * initial route. Detail screens used to be pushed onto a stack *above* the tab
 * navigator, which covered the tab bar; keeping them in here means a push stays
 * inside the current tab and the bar stays put.
 */
function TabStack({ initialRouteName }: { initialRouteName: keyof RootStackParamList }) {
  useThemeRepaint();
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Data" component={DataScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="BudgetSetup"
        component={BudgetSetupScreen}
        initialParams={{ mode: 'newMonth' }}
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

// Defined at module scope so each tab keeps one stable component identity —
// inline arrows would remount the whole stack on every tab bar render.
const HomeStack = () => <TabStack initialRouteName="Dashboard" />;
const BudgetStack = () => <TabStack initialRouteName="BudgetSetup" />;
const HistoryStack = () => <TabStack initialRouteName="History" />;
const DataStack = () => <TabStack initialRouteName="Data" />;
const MoreStack = () => <TabStack initialRouteName="Settings" />;

export function TabNavigator() {
  useThemeRepaint();
  const insets = useSafeAreaInsets();
  const { data: activeProfile } = useActiveProfile();
  const { data: currentPeriod } = useCurrentPeriod(activeProfile?.id, activeProfile?.cycle_start_day ?? 1);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          // Lifted off the page rather than painted in the same colour as it:
          // against the light theme's cream background the bar was the page, with
          // only a faint hairline to say otherwise.
          backgroundColor: colors.card,
          borderTopColor: colors.borderStrong,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
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
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'HOME' }} />
      <Tab.Screen
        name="BudgetTab"
        component={BudgetStack}
        options={{ tabBarLabel: 'BUDGET' }}
        listeners={({ navigation }) => ({
          // The budget screen needs the current period's params, which the tab's
          // static initial route cannot know, so the press is handled here.
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('BudgetTab', {
              screen: 'BudgetSetup',
              params: currentPeriod
                ? { mode: 'edit', periodId: currentPeriod.id }
                : { mode: 'newMonth' },
            });
          },
        })}
      />
      <Tab.Screen name="HistoryTab" component={HistoryStack} options={{ tabBarLabel: 'HISTORY' }} />
      <Tab.Screen name="DataTab" component={DataStack} options={{ tabBarLabel: 'DATA' }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ tabBarLabel: 'MORE' }} />
    </Tab.Navigator>
  );
}
