import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainTabs: undefined;
  CategoryDetail: { categoryId: number; periodId: number };
  BudgetSetup: { mode: 'onboarding' | 'edit' | 'newMonth' | 'newProfile'; periodId?: number };
  HistoryDetail: { periodId: number };
  CategoryManagement: undefined;
  BudgetProfiles: undefined;
  MasterData: undefined;
  Accounts: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Budget: undefined;
  History: undefined;
  Data: undefined;
  Settings: undefined;
};

export type TabScreenProps<T extends keyof MainTabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
