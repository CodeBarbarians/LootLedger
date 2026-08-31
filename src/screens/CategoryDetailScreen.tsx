import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FieldInput } from '../components/FieldInput';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { StatusPill, type PillTone } from '../components/StatusPill';
import { Text } from '../components/Text';
import { useCategoriesWithProgress } from '../hooks/useAggregates';
import { useCategories } from '../hooks/useCategories';
import {
  useCreateSubcategory,
  useDeleteSubcategory,
  useMarkSubcategoryPaid,
  usePaySubcategoryPartial,
  useSubcategories,
} from '../hooks/useSubcategories';
import { useAddTransaction, useDeleteTransaction, useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { Subcategory } from '../db/types';
import { formatAmount } from '../utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryDetail'>;

const STATUS_TONE: Record<Subcategory['status'], { label: string; tone: PillTone }> = {
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  partial: { label: 'Partial', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
};

export function CategoryDetailScreen({ route }: Props) {
  const { categoryId, periodId } = route.params;
  const { data: settings } = useSettings();
  const { data: categories } = useCategories(true);
  const { data: progressList } = useCategoriesWithProgress(periodId);
  const { data: subcategories } = useSubcategories(periodId, categoryId);
  const { data: transactions } = useTransactions(periodId, categoryId);

  const createSubcategory = useCreateSubcategory(periodId);
  const markPaid = useMarkSubcategoryPaid(periodId);
  const payPartial = usePaySubcategoryPartial(periodId);
  const deleteSubcategory = useDeleteSubcategory(periodId);
  const addTransaction = useAddTransaction(periodId);
  const deleteTransaction = useDeleteTransaction(periodId);

  const symbol = settings?.currency_symbol ?? 'Rs';
  const category = categories?.find((c) => c.id === categoryId);
  const progress = progressList?.find((c) => c.id === categoryId);

  const [showAddSub, setShowAddSub] = useState(false);
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');

  const [showSpend, setShowSpend] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendNote, setSpendNote] = useState('');

  const [partialTargetId, setPartialTargetId] = useState<number | null>(null);
  const [partialAmount, setPartialAmount] = useState('');

  async function handleAddSubcategory() {
    const amount = parseFloat(subAmount) || 0;
    if (!subName.trim() || amount <= 0) return;
    await createSubcategory.mutateAsync({ categoryId, name: subName.trim(), amountBudgeted: amount });
    setSubName('');
    setSubAmount('');
    setShowAddSub(false);
  }

  async function handleLogSpend() {
    const amount = parseFloat(spendAmount) || 0;
    if (amount <= 0) return;
    await addTransaction.mutateAsync({ categoryId, amount, note: spendNote.trim() || undefined });
    setSpendAmount('');
    setSpendNote('');
    setShowSpend(false);
  }

  async function handlePartialPay(subcategoryId: number) {
    const amount = parseFloat(partialAmount) || 0;
    if (amount <= 0) return;
    await payPartial.mutateAsync({ subcategoryId, amount });
    setPartialAmount('');
    setPartialTargetId(null);
  }

  const fraction = progress && progress.allocated > 0 ? progress.spent / progress.allocated : 0;
  const over = (progress?.spent ?? 0) > (progress?.allocated ?? 0);

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: category?.color ?? colors.accent }]} />
        <Text variant="display">{category?.name ?? 'Category'}</Text>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.summaryRow}>
          <SummaryStat label="Allocated" value={formatAmount(progress?.allocated ?? 0, symbol)} />
          <SummaryStat label="Spent" value={formatAmount(progress?.spent ?? 0, symbol)} />
          <SummaryStat
            label={over ? 'Over' : 'Pending'}
            value={formatAmount(Math.abs(progress?.remaining ?? 0), symbol)}
            tone={over ? colors.danger : colors.success}
          />
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <ProgressBar fraction={fraction} />
        </View>
      </Card>

      <View style={styles.sectionHeaderRow}>
        <Text variant="monoLabel" color={colors.textFaint}>
          Subcategories
        </Text>
        <Pressable onPress={() => setShowAddSub((v) => !v)}>
          <Text variant="label" color={colors.accent}>
            {showAddSub ? 'Cancel' : '+ Add'}
          </Text>
        </Pressable>
      </View>

      {showAddSub ? (
        <Card style={{ marginBottom: spacing.md }}>
          <FieldInput label="Name" placeholder="Pocket Money — Person 1" value={subName} onChangeText={setSubName} />
          <View style={{ marginTop: spacing.md }}>
            <FieldInput
              label="Budgeted Amount"
              keyboardType="decimal-pad"
              prefix={symbol}
              placeholder="0"
              value={subAmount}
              onChangeText={setSubAmount}
            />
          </View>
          <Button label="Add Subcategory" onPress={handleAddSubcategory} style={{ marginTop: spacing.md }} />
        </Card>
      ) : null}

      {(subcategories ?? []).length === 0 && !showAddSub ? (
        <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.lg }}>
          No subcategories yet.
        </Text>
      ) : null}

      {(subcategories ?? []).map((sub) => {
        const pending = sub.amount_budgeted - sub.amount_paid;
        const tone = STATUS_TONE[sub.status];
        return (
          <Card key={sub.id} style={styles.subCard}>
            <View style={styles.subTopRow}>
              <Text variant="body" style={{ flex: 1 }}>
                {sub.name}
              </Text>
              <StatusPill label={tone.label} tone={tone.tone} />
            </View>
            <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
              <Text variant="label">
                Budgeted <Text variant="body">{formatAmount(sub.amount_budgeted, symbol)}</Text>
              </Text>
              <Text variant="label">
                Pending <Text variant="body">{formatAmount(Math.max(0, pending), symbol)}</Text>
              </Text>
            </View>

            {sub.status !== 'paid' ? (
              <View style={styles.subActionsRow}>
                <Button
                  label="Mark as Paid"
                  variant="secondary"
                  onPress={() => markPaid.mutate(sub.id)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Partial"
                  variant="ghost"
                  onPress={() => setPartialTargetId(partialTargetId === sub.id ? null : sub.id)}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}

            {partialTargetId === sub.id ? (
              <View style={{ marginTop: spacing.md }}>
                <FieldInput
                  keyboardType="decimal-pad"
                  prefix={symbol}
                  placeholder="Amount paid"
                  value={partialAmount}
                  onChangeText={setPartialAmount}
                />
                <Button
                  label="Record Payment"
                  onPress={() => handlePartialPay(sub.id)}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : null}

            <Pressable onPress={() => deleteSubcategory.mutate(sub.id)} style={{ marginTop: spacing.md }}>
              <Text variant="label" color={colors.danger}>
                Delete
              </Text>
            </Pressable>
          </Card>
        );
      })}

      <View style={styles.sectionHeaderRow}>
        <Text variant="monoLabel" color={colors.textFaint}>
          Transactions
        </Text>
        <Pressable onPress={() => setShowSpend((v) => !v)}>
          <Text variant="label" color={colors.accent}>
            {showSpend ? 'Cancel' : '+ Log a Spend'}
          </Text>
        </Pressable>
      </View>

      {showSpend ? (
        <Card style={{ marginBottom: spacing.md }}>
          <FieldInput
            label="Amount"
            keyboardType="decimal-pad"
            prefix={symbol}
            placeholder="0"
            value={spendAmount}
            onChangeText={setSpendAmount}
          />
          <View style={{ marginTop: spacing.md }}>
            <FieldInput label="Note (optional)" placeholder="What was it for?" value={spendNote} onChangeText={setSpendNote} />
          </View>
          <Button label="Log Spend" onPress={handleLogSpend} style={{ marginTop: spacing.md }} />
        </Card>
      ) : null}

      {(transactions ?? []).length === 0 && !showSpend ? (
        <Text variant="label" color={colors.textMuted}>
          No spends logged yet.
        </Text>
      ) : null}

      {(transactions ?? []).map((t) => (
        <Card key={t.id} style={styles.txRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body">{formatAmount(t.amount, symbol)}</Text>
            {t.note ? (
              <Text variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
                {t.note}
              </Text>
            ) : null}
          </View>
          {t.subcategory_id == null ? (
            <Pressable onPress={() => deleteTransaction.mutate(t.id)}>
              <Text variant="label" color={colors.danger}>
                Delete
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </ScreenContainer>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="monoLabel">{label}</Text>
      <Text variant="heading" color={tone} style={{ marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7 },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  subCard: { marginBottom: spacing.md },
  subTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  txRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
});
