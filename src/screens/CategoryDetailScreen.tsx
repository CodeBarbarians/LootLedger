import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AddExpenseSheet } from '../components/app/AddExpenseSheet';
import { Bar } from '../components/app/Bar';
import { CategoryFormSheet } from '../components/app/CategoryFormSheet';
import { Screen } from '../components/app/Screen';
import { Text } from '../components/app/Text';
import type { Subcategory } from '../db/types';
import { useCategoriesWithProgress } from '../hooks/useAggregates';
import { useCategories } from '../hooks/useCategories';
import { useSettings } from '../hooks/useSettings';
import {
  useCreateSubcategory,
  useDeleteSubcategory,
  useMarkSubcategoryPaid,
  useSubcategories,
  useUnpaySubcategory,
} from '../hooks/useSubcategories';
import { useDeleteTransaction, useTransactions } from '../hooks/useTransactions';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { formatAmount, formatPercent } from '../utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryDetail'>;

export function CategoryDetailScreen({ route, navigation }: Props) {
  const { categoryId, periodId } = route.params;
  const { data: settings } = useSettings();
  const { data: categories } = useCategories(true);
  const { data: progressList } = useCategoriesWithProgress(periodId);
  const { data: subcategories } = useSubcategories(periodId, categoryId);
  const { data: transactions } = useTransactions(periodId, categoryId);

  const createSubcategory = useCreateSubcategory(periodId);
  const markPaid = useMarkSubcategoryPaid(periodId);
  const unpaySubcategory = useUnpaySubcategory(periodId);
  const deleteSubcategory = useDeleteSubcategory(periodId);
  const deleteTransaction = useDeleteTransaction(periodId);

  const symbol = settings?.currency_symbol ?? 'Rs';
  const category = categories?.find((c) => c.id === categoryId);
  const progress = progressList?.find((c) => c.id === categoryId);

  const [showNewSub, setShowNewSub] = useState(false);
  const [showSpend, setShowSpend] = useState(false);

  const left = progress?.remaining ?? 0;
  const over = left < -0.5;
  const fraction = progress && progress.allocated > 0 ? progress.spent / progress.allocated : 0;
  const share = progress && settings ? (settings.salary_amount > 0 ? progress.allocated / settings.salary_amount : 0) : 0;

  return (
    <Screen onBack={() => navigation.goBack()}>
      <View className="flex-row items-center gap-2.5">
        <View className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: category?.color ?? colors.accent }} />
        <Text style={{ fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.2 }} className="font-heading">
          {category?.name ?? 'Category'}
        </Text>
      </View>

      <View className="rounded-3xl border border-border bg-card p-5 mt-4">
        <View className="flex-row justify-between items-end gap-2.5">
          <View>
            <Text variant="mono" className="text-[9px] tracking-widest text-faint">
              {over ? 'OVER BUDGET' : 'PENDING'}
            </Text>
            <Text
              className="mt-1"
              style={{ fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.4, color: over ? colors.danger : colors.textPrimary }}
            >
              {formatAmount(Math.abs(left), symbol)}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="mono" className="text-[10px] text-faint">
              {formatPercent(share)} of salary
            </Text>
            <Text variant="mono" className="font-mono-bold text-[13px] mt-1">
              {formatAmount(progress?.allocated ?? 0, symbol)}
            </Text>
          </View>
        </View>
        <View className="mt-4">
          <Bar fraction={fraction} height={8} color={over ? colors.danger : category?.color} />
        </View>
        <View className="flex-row justify-between mt-[9px]">
          <Text variant="mono" className="text-[10px] text-faint">
            {formatAmount(progress?.spent ?? 0, symbol)} spent
          </Text>
          <Text variant="mono" className="text-[10px] text-faint">
            {progress && progress.allocated > 0 ? Math.round((progress.spent / progress.allocated) * 100) : 0}% used
          </Text>
        </View>
      </View>

      <View className="flex-row items-baseline justify-between mt-6 mb-2.5 px-0.5">
        <Text variant="monoLabel">Subcategories</Text>
        <Pressable onPress={() => setShowNewSub(true)}>
          <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
            + ADD
          </Text>
        </Pressable>
      </View>

      {(subcategories ?? []).length === 0 ? (
        <View className="rounded-2xl border border-dashed border-border p-5 items-center">
          <Text variant="mono" className="text-[11px] text-faint">
            No subcategories yet
          </Text>
        </View>
      ) : null}

      {(subcategories ?? []).map((sub: Subcategory) => {
        const paid = sub.status === 'paid';
        const pending = sub.amount_budgeted - sub.amount_paid;
        return (
          <View key={sub.id} className="rounded-[18px] border border-border bg-card px-3.5 py-3.5 mb-2.5 flex-row items-center gap-2.5">
            <View className="flex-1 min-w-0">
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: paid ? colors.textMuted : colors.textPrimary,
                  textDecorationLine: paid ? 'line-through' : 'none',
                }}
                numberOfLines={1}
              >
                {sub.name}
              </Text>
              <Text variant="mono" className="text-[10px] text-faint mt-1">
                {formatAmount(sub.amount_budgeted, symbol)} {paid ? '· paid' : sub.status === 'partial' ? `· ${formatAmount(pending, symbol)} left` : '· pending'}
              </Text>
            </View>
            <Pressable
              onPress={() => (paid ? unpaySubcategory.mutate(sub.id) : markPaid.mutate(sub.id))}
              className="rounded-full px-3.5 py-2.5 border"
              style={{
                backgroundColor: paid ? colors.success : 'transparent',
                borderColor: paid ? colors.success : colors.borderStrong,
              }}
            >
              <Text
                variant="mono"
                className="font-mono-bold text-[10px] tracking-wider"
                style={{ color: paid ? colors.accentOn : colors.accent }}
              >
                {paid ? 'PAID' : 'MARK PAID'}
              </Text>
            </Pressable>
            <Pressable onPress={() => deleteSubcategory.mutate(sub.id)} hitSlop={8}>
              <Text style={{ color: colors.borderStrong, fontSize: 15 }}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      <View className="flex-row items-baseline justify-between mt-6 mb-2.5 px-0.5">
        <Text variant="monoLabel">Spend log</Text>
        <Pressable onPress={() => setShowSpend(true)}>
          <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
            + SPEND
          </Text>
        </Pressable>
      </View>

      {(transactions ?? []).length === 0 ? (
        <View className="rounded-2xl border border-dashed border-border p-5 items-center">
          <Text variant="mono" className="text-[11px] text-faint">
            Nothing spent from this category yet
          </Text>
        </View>
      ) : null}

      {(transactions ?? []).map((t) => (
        <View key={t.id} className="flex-row items-center gap-2.5 py-3.5 px-1 border-b border-divider">
          <View className="flex-1 min-w-0">
            <Text style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
              {t.note ?? category?.name ?? 'Expense'}
            </Text>
            <Text variant="mono" className="text-[10px] text-faint mt-0.5">
              {new Date(t.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
              {t.subcategory_id ? ' · subcategory' : ' · quick add'}
            </Text>
          </View>
          <Text variant="mono" className="font-mono-bold text-[13px]">
            −{formatAmount(t.amount, symbol)}
          </Text>
          {t.subcategory_id == null ? (
            <Pressable onPress={() => deleteTransaction.mutate(t.id)} hitSlop={8}>
              <Text style={{ color: colors.borderStrong, fontSize: 13 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <CategoryFormSheet
        isOpen={showNewSub}
        onClose={() => setShowNewSub(false)}
        mode="subcategory"
        parentName={category?.name}
        valueLabel={`PLANNED AMOUNT (${symbol})`}
        namePlaceholder="e.g. Pocket money — Person 3"
        onSubmit={async (data) => {
          await createSubcategory.mutateAsync({ categoryId, name: data.name, amountBudgeted: data.value });
        }}
      />

      <AddExpenseSheet
        isOpen={showSpend}
        onClose={() => setShowSpend(false)}
        periodId={periodId}
        categories={progressList ?? []}
        currencySymbol={symbol}
        initialCategoryId={categoryId}
      />
    </Screen>
  );
}
