import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { CategoryWithProgress } from '../../db/types';
import { useAddTransaction } from '../../hooks/useTransactions';
import { usePaySubcategoryPartial, useSubcategories } from '../../hooks/useSubcategories';
import { colors } from '../../theme';
import { formatAmount } from '../../utils/currency';
import { BottomSheet } from './BottomSheet';
import { CTAButton } from './CTAButton';
import { NumberPad } from './NumberPad';
import { Pill } from './Pill';
import { Text } from './Text';
import { useToast } from './Toast';

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: number | undefined;
  categories: CategoryWithProgress[];
  currencySymbol: string;
  initialCategoryId?: number;
}

export function AddExpenseSheet({
  isOpen,
  onClose,
  periodId,
  categories,
  currencySymbol,
  initialCategoryId,
}: AddExpenseSheetProps) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(initialCategoryId ?? categories[0]?.id);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const { data: subcategories } = useSubcategories(periodId, categoryId);
  const addTransaction = useAddTransaction(periodId);
  const payPartial = usePaySubcategoryPartial(periodId);
  const { show } = useToast();

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setCategoryId(initialCategoryId ?? categories[0]?.id);
      setSubcategoryId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCategoryId]);

  const category = categories.find((c) => c.id === categoryId);
  const pending = category ? category.allocated - category.spent : 0;
  const amountNum = Number(amount || 0);
  const overBudget = amountNum > pending && amountNum > 0;

  function press(key: string) {
    setAmount((prev) => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '000') return prev === '' ? '' : (prev + '000').slice(0, 9);
      return (prev + key).replace(/^0+(?=\d)/, '').slice(0, 9);
    });
  }

  async function save() {
    if (amountNum <= 0 || !categoryId) {
      show('Enter an amount first');
      return;
    }
    if (subcategoryId) {
      await payPartial.mutateAsync({ subcategoryId, amount: amountNum });
    } else {
      await addTransaction.mutateAsync({ categoryId, amount: amountNum });
    }
    show(`${formatAmount(amountNum, currencySymbol)} subtracted from ${category?.name ?? ''}`);
    onClose();
  }

  const hint = category
    ? overBudget
      ? `This pushes ${category.name} ${formatAmount(amountNum - pending, currencySymbol)} over budget`
      : `${formatAmount(pending, currencySymbol)} pending in ${category.name}`
    : 'Pick a category';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="LOG AN EXPENSE">
      <View className="items-center py-4">
        <Text variant="mono" className="text-xs">
          {currencySymbol}
        </Text>
        <Text
          className="mt-0.5"
          style={{
            fontFamily: 'SpaceGrotesk_700Bold',
            fontSize: 42,
            lineHeight: 50,
            letterSpacing: -0.8,
            color: overBudget ? colors.danger : colors.textPrimary,
          }}
        >
          {amount ? Number(amount).toLocaleString('en-US') : '0'}
        </Text>
        <Text variant="mono" className="mt-1.5 text-[10px] text-faint text-center px-4">
          {hint}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-1.5 mt-1">
        <View className="flex-row gap-1.5">
          {categories.map((c) => (
            <Pill
              key={c.id}
              label={c.name}
              mono={false}
              active={c.id === categoryId}
              activeColor={c.color}
              inactiveTextColor={colors.textPrimary}
              onPress={() => {
                setCategoryId(c.id);
                setSubcategoryId(undefined);
              }}
            />
          ))}
        </View>
      </ScrollView>

      {(subcategories ?? []).length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          <View className="flex-row gap-1.5">
            {subcategories!.map((s) => (
              <Pill
                key={s.id}
                label={s.name}
                size="sm"
                active={s.id === subcategoryId}
                activeColor={colors.textPrimary}
                onPress={() => setSubcategoryId((prev) => (prev === s.id ? undefined : s.id))}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      <NumberPad onPress={press} />

      <CTAButton label="SUBTRACT FROM BUDGET" className="mt-3" onPress={save} />
    </BottomSheet>
  );
}
