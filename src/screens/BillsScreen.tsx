import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { AddItemSheet } from '../components/app/AddItemSheet';
import { CTAButton } from '../components/app/CTAButton';
import { Pill } from '../components/app/Pill';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import { useAccounts } from '../hooks/useAccounts';
import {
  cancelBillReminder,
  scheduleBillReminder,
  useBillNotificationPermission,
} from '../hooks/useBillNotifications';
import {
  getBillPeriodKey,
  useArchiveBill,
  useBillPayments,
  useBills,
  useCreateBill,
  useMarkBillPaid,
  useUnarchiveBill,
  useUpdateBill,
} from '../hooks/useBills';
import { useCategories } from '../hooks/useCategories';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useActiveProfile } from '../hooks/useProfiles';
import type { Bill, BillRecurrence } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'Bills'>;

const RECURRENCE_LABEL: Record<BillRecurrence, string> = {
  monthly: 'MONTHLY',
  weekly: 'WEEKLY',
  yearly: 'YEARLY',
};

export function BillsScreen({ navigation }: Props) {
  const { data: profile } = useActiveProfile();
  const profileId = profile?.id as number;
  const symbol = profile?.currency_symbol ?? 'Rs';
  const { data: bills } = useBills(profileId, true);
  const { data: categories } = useCategories(profileId);
  const { data: accounts } = useAccounts(profileId);
  const { data: currentPeriod } = useCurrentPeriod(profile?.id, profile?.cycle_start_day ?? 1);
  const createBill = useCreateBill(profileId);
  const updateBill = useUpdateBill(profileId);
  const archiveBill = useArchiveBill(profileId);
  const unarchiveBill = useUnarchiveBill(profileId);
  const markBillPaid = useMarkBillPaid(profileId);
  const { show } = useToast();
  useBillNotificationPermission();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const selected = bills?.find((b) => b.id === selectedId) ?? null;
  const { data: payments } = useBillPayments(selected?.id);

  useEffect(() => {
    if (!selectedId && bills && bills.length > 0) {
      setSelectedId(bills[0].id);
    }
  }, [bills, selectedId]);

  useEffect(() => {
    setName(selected?.name ?? '');
    setAmount(selected ? String(selected.amount) : '');
    setDueDay(selected ? String(selected.due_day) : '');
    setReminderDaysBefore(selected ? String(selected.reminder_days_before) : '');
  }, [selected?.id]);

  const currentPeriodKey = selected ? getBillPeriodKey(selected.due_day) : null;
  const paidThisPeriod = (payments ?? []).some((p) => p.period_key === currentPeriodKey);

  async function saveName() {
    if (!selected || !name.trim() || name.trim() === selected.name) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { name: name.trim() } });
    await scheduleBillReminder({ ...selected, name: name.trim() }, symbol);
    show('Bill renamed');
  }

  async function saveAmount() {
    if (!selected) return;
    const parsed = parseFloat(amount);
    const next = Number.isFinite(parsed) ? parsed : 0;
    setAmount(String(next));
    if (next === selected.amount) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { amount: next } });
    await scheduleBillReminder({ ...selected, amount: next }, symbol);
  }

  async function saveDueDay() {
    if (!selected) return;
    const parsed = Math.round(parseFloat(dueDay));
    const next = Number.isFinite(parsed) ? Math.min(31, Math.max(1, parsed)) : selected.due_day;
    setDueDay(String(next));
    if (next === selected.due_day) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { due_day: next } });
    await scheduleBillReminder({ ...selected, due_day: next }, symbol);
  }

  async function saveReminderDaysBefore() {
    if (!selected) return;
    const parsed = Math.round(parseFloat(reminderDaysBefore));
    const next = Number.isFinite(parsed) ? Math.max(0, parsed) : selected.reminder_days_before;
    setReminderDaysBefore(String(next));
    if (next === selected.reminder_days_before) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { reminder_days_before: next } });
    await scheduleBillReminder({ ...selected, reminder_days_before: next }, symbol);
  }

  async function setCategory(categoryId: number | null) {
    if (!selected) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { category_id: categoryId } });
  }

  async function setAccount(accountId: number | null) {
    if (!selected) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { account_id: accountId } });
  }

  async function setRecurrence(recurrence: BillRecurrence) {
    if (!selected) return;
    await updateBill.mutateAsync({ id: selected.id, patch: { recurrence } });
    await scheduleBillReminder({ ...selected, recurrence }, symbol);
  }

  async function toggleArchived() {
    if (!selected) return;
    if (selected.archived) {
      await unarchiveBill.mutateAsync(selected.id);
      await scheduleBillReminder({ ...selected, archived: 0 }, symbol);
      show('Bill restored');
    } else {
      await archiveBill.mutateAsync(selected.id);
      await cancelBillReminder(selected.id);
      show('Bill archived');
    }
  }

  async function submitNewBill(newName: string) {
    const newBill = {
      name: newName,
      amount: 0,
      categoryId: null,
      accountId: null,
      dueDay: 1,
      recurrence: 'monthly' as BillRecurrence,
      reminderDaysBefore: 3,
    };
    const id = await createBill.mutateAsync(newBill);
    await scheduleBillReminder(
      {
        id,
        name: newBill.name,
        amount: newBill.amount,
        due_day: newBill.dueDay,
        recurrence: newBill.recurrence,
        reminder_days_before: newBill.reminderDaysBefore,
        archived: 0,
      },
      symbol
    );
    setSelectedId(id);
    show('Bill added');
  }

  async function markPaid() {
    if (!selected || !currentPeriodKey) return;
    await markBillPaid.mutateAsync({
      billId: selected.id,
      data: {
        periodKey: currentPeriodKey,
        amountPaid: selected.amount,
        periodId: currentPeriod?.id ?? null,
      },
    });
    show(selected.category_id != null ? 'Marked paid and logged as an expense' : 'Marked paid');
  }

  return (
    <Screen onBack={() => navigation.goBack()} topBarTitle="Bills" scroll={false}>
      <SectionLabel number="11" label="BILLS" title="Never miss a due date" />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{ width: 112 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(bills ?? []).map((b: Bill) => {
              const active = b.id === selectedId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedId(b.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: active ? colors.cardInset : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.borderStrong : 'transparent',
                    opacity: b.archived ? 0.4 : 1,
                  }}
                >
                  <Text
                    style={{ fontSize: 11, fontWeight: '600', color: active ? colors.textPrimary : colors.textMuted }}
                    numberOfLines={2}
                  >
                    {b.name}
                  </Text>
                  <Text variant="mono" className="text-[9px] text-faint mt-1">
                    {formatAmount(b.amount, symbol)}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setAddSheetOpen(true)}
              style={{
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text variant="mono" className="font-mono-bold text-[10px] text-faint">
                + NEW
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={{ width: 1, backgroundColor: colors.divider, marginHorizontal: 12 }} />

        {/* Detail panel */}
        <View style={{ flex: 1 }}>
          {selected ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 23 }} className="font-heading" numberOfLines={1}>
                {selected.name}
              </Text>
              {selected.archived ? (
                <Text variant="mono" className="text-[10px] text-faint mt-1">
                  ARCHIVED
                </Text>
              ) : (
                <Text variant="mono" className="text-[10px] text-faint mt-1">
                  {paidThisPeriod ? 'PAID FOR THIS PERIOD' : `DUE ${currentPeriodKey ?? ''}`}
                </Text>
              )}

              <View
                style={{
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  borderRadius: 16,
                  backgroundColor: colors.card,
                  padding: 16,
                }}
              >
                <Text variant="mono" className="text-[9px] tracking-widest text-faint">
                  NAME
                </Text>
                <View
                  style={{
                    marginTop: 6,
                    height: 40,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.background,
                    justifyContent: 'center',
                  }}
                >
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    onBlur={saveName}
                    onSubmitEditing={saveName}
                    style={{
                      height: 40,
                      padding: 0,
                      color: colors.textPrimary,
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 14,
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                    }}
                  />
                </View>

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  AMOUNT · {symbol}
                </Text>
                <View
                  style={{
                    marginTop: 6,
                    height: 40,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.background,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text variant="mono" className="text-faint" style={{ fontSize: 14 }}>
                    {symbol}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    onBlur={saveAmount}
                    onSubmitEditing={saveAmount}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      height: 40,
                      padding: 0,
                      color: colors.textPrimary,
                      fontFamily: 'SpaceMono_700Bold',
                      fontSize: 14,
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="mono" className="text-[9px] tracking-widest text-faint">
                      DUE DAY
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        height: 40,
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor: colors.background,
                        justifyContent: 'center',
                      }}
                    >
                      <TextInput
                        value={dueDay}
                        onChangeText={setDueDay}
                        onBlur={saveDueDay}
                        onSubmitEditing={saveDueDay}
                        keyboardType="number-pad"
                        style={{
                          height: 40,
                          padding: 0,
                          color: colors.textPrimary,
                          fontFamily: 'SpaceMono_700Bold',
                          fontSize: 14,
                          includeFontPadding: false,
                          textAlignVertical: 'center',
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text variant="mono" className="text-[9px] tracking-widest text-faint">
                      REMIND · DAYS BEFORE
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        height: 40,
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor: colors.background,
                        justifyContent: 'center',
                      }}
                    >
                      <TextInput
                        value={reminderDaysBefore}
                        onChangeText={setReminderDaysBefore}
                        onBlur={saveReminderDaysBefore}
                        onSubmitEditing={saveReminderDaysBefore}
                        keyboardType="number-pad"
                        style={{
                          height: 40,
                          padding: 0,
                          color: colors.textPrimary,
                          fontFamily: 'SpaceMono_700Bold',
                          fontSize: 14,
                          includeFontPadding: false,
                          textAlignVertical: 'center',
                        }}
                      />
                    </View>
                  </View>
                </View>

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  RECURRENCE
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(Object.keys(RECURRENCE_LABEL) as BillRecurrence[]).map((r) => (
                    <Pill
                      key={r}
                      label={RECURRENCE_LABEL[r]}
                      size="sm"
                      active={selected.recurrence === r}
                      activeColor={colors.textPrimary}
                      onPress={() => setRecurrence(r)}
                    />
                  ))}
                </View>

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  CATEGORY · LOGGED AS AN EXPENSE WHEN PAID
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Pill
                    label="NONE"
                    size="sm"
                    active={selected.category_id == null}
                    onPress={() => setCategory(null)}
                  />
                  {(categories ?? []).map((c) => (
                    <Pill
                      key={c.id}
                      label={c.name.toUpperCase()}
                      size="sm"
                      active={selected.category_id === c.id}
                      activeColor={c.color}
                      onPress={() => setCategory(c.id)}
                    />
                  ))}
                </View>

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  LINKED ACCOUNT
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Pill
                    label="NONE"
                    size="sm"
                    active={selected.account_id == null}
                    onPress={() => setAccount(null)}
                  />
                  {(accounts ?? []).map((a) => (
                    <Pill
                      key={a.id}
                      label={a.name.toUpperCase()}
                      size="sm"
                      active={selected.account_id === a.id}
                      activeColor={a.color}
                      onPress={() => setAccount(a.id)}
                    />
                  ))}
                </View>
              </View>

              <CTAButton
                label={paidThisPeriod ? 'PAID FOR THIS PERIOD' : 'MARK PAID FOR THIS PERIOD'}
                className="mt-6"
                onPress={markPaid}
                disabled={!!selected.archived || paidThisPeriod}
                loading={markBillPaid.isPending}
              />

              <CTAButton
                label={selected.archived ? 'RESTORE BILL' : 'ARCHIVE BILL'}
                variant={selected.archived ? 'solid' : 'danger'}
                className="mt-3"
                onPress={toggleArchived}
              />
              <Text variant="mono" className="text-[10px] text-faint mt-3 leading-4">
                {selected.archived
                  ? 'Restoring brings it back into the due-soon list. Its payment history is unaffected either way.'
                  : 'Archiving drops it from the due-soon list. Its payment history is kept.'}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="label">No bills yet — add one to start tracking due dates.</Text>
          )}
        </View>
      </View>

      <AddItemSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="NEW BILL"
        placeholder="e.g. Electricity"
        onSubmit={submitNewBill}
      />
    </Screen>
  );
}
