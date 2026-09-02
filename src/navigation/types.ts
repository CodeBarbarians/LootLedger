import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Every screen that lives inside a tab. One stack definition holds all of them
 * and is instantiated once per tab with a different initial route, so pushing a
 * detail screen keeps the tab bar visible and `navigate('Accounts')` works from
 * wherever it is called.
 */
export type RootStackParamList = {
  Dashboard: undefined;
  History: undefined;
  Data: undefined;
  Settings: undefined;
  CategoryDetail: { categoryId: number; periodId: number };
  BudgetSetup: { mode: 'onboarding' | 'edit' | 'newMonth' | 'newProfile'; periodId?: number };
  HistoryDetail: { periodId: number };
  CategoryManagement: undefined;
  BudgetProfiles: undefined;
  MasterData: undefined;
  Accounts: undefined;
  Debts: undefined;
  Bills: undefined;
  Goals: undefined;
};

export type MainTabsParamList = {
  HomeTab: NavigatorScreenParams<RootStackParamList>;
  BudgetTab: NavigatorScreenParams<RootStackParamList>;
  HistoryTab: NavigatorScreenParams<RootStackParamList>;
  DataTab: NavigatorScreenParams<RootStackParamList>;
  MoreTab: NavigatorScreenParams<RootStackParamList>;
};

/**
 * Above the tabs. Only first-run onboarding lives here — it must not show a tab
 * bar to escape through before a budget profile exists.
 */
export type OuterStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  Onboarding: { mode: 'onboarding' | 'edit' | 'newMonth' | 'newProfile'; periodId?: number };
};

export type TabScreenProps<T extends keyof RootStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, T>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabsParamList>,
    NativeStackScreenProps<OuterStackParamList>
  >
>;
