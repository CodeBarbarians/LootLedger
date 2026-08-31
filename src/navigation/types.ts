import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainTabs: undefined;
  CategoryDetail: { categoryId: number; periodId: number };
  BudgetSetup: { mode: 'onboarding' | 'edit' | 'newMonth'; periodId?: number };
  HistoryDetail: { periodId: number };
};

export type MainTabsParamList = {
  Dashboard: undefined;
  History: undefined;
  Settings: undefined;
};

export type TabScreenProps<T extends keyof MainTabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
