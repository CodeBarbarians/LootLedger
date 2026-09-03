import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AddItemSheet } from '../components/app/AddItemSheet';
import { CTAButton } from '../components/app/CTAButton';
import { ConfirmDialog } from '../components/app/ConfirmDialog';
import { DebtPaymentSheet } from '../components/app/DebtPaymentSheet';
import { Pill } from '../components/app/Pill';
import { Screen } from '../components/app/Screen';
import { useScreenTour } from '../components/app/tour';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import type { Debt, DebtKind } from '../db/types';
import { useAccounts } from '../hooks/useAccounts';
import {
  useArchiveDebt,
  useCreateDebt,
  useDebts,
  useRecordPayment,
  useUnarchiveDebt,
  useUpdateDebt,
  useDeleteDebt,
} from '../hooks/useDebts';
import { useActiveProfile } from '../hooks/useProfiles';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors, useThemeRepaint } from '../theme';
import { formatAmount } from '../utils/currency';
import { computePayoffProjections, type PayoffPlanDebt, type PayoffResult } from '../utils/payoff';

type Props = NativeStackScreenProps<RootStackParamList, 'Debts'>;

const KIND_LABEL: Record<DebtKind, string> = {
  credit_card: 'CREDIT CARD',
  personal_loan: 'PERSONAL LOAN',
  student_loan: 'STUDENT LOAN',
  auto_loan: 'AUTO LOAN',
  medical: 'MEDICAL',
  other: 'OTHER',
};

function PlanList({ title, result, symbol }: { title: string; result: PayoffResult | null; symbol: string }) {
  return (
    <View className="flex-1">
      <Text variant="mono" className="text-[9px] tracking-widest text-faint">
        {title}
      </Text>
      {result && result.order.length > 0 ? (
        <>
          {result.order.map((entry, i) => (
            <View key={entry.id} className="flex-row items-center gap-2 mt-2.5">
              <Text variant="mono" className="font-mono-bold text-[10px]" style={{ color: colors.accent, width: 14 }}>
                {i + 1}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text variant="mono" className="text-[10px] text-faint">
                {entry.monthsToPayoff}mo
              </Text>
            </View>
          ))}
          <Text variant="mono" className="text-[9px] text-faint mt-3">
            DEBT-FREE IN {result.totalMonths} MONTHS
          </Text>
        </>
      ) : (
        <Text variant="mono" className="text-[10px] text-faint mt-2.5">
          Add a debt to see a plan.
        </Text>
      )}
    </View>
  );
}

export function DebtsScreen({ navigation }: Props) {
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const profileId = profile?.id as number;
  const symbol = profile?.currency_symbol ?? 'Rs';
  const { data: debts } = useDebts(profileId, true);
  const { data: accounts } = useAccounts(profileId);
  const createDebt = useCreateDebt(profileId);
  const updateDebt = useUpdateDebt(profileId);
  const archiveDebt = useArchiveDebt(profileId);
  const unarchiveDebt = useUnarchiveDebt(profileId);
  const recordPayment = useRecordPayment(profileId);
  const { show } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [principalBalance, setPrincipalBalance] = useState('');
  const [aprPercent, setAprPercent] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [extraPayment, setExtraPayment] = useState('');

  const selected = debts?.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && debts && debts.length > 0) {
      setSelectedId(debts[0].id);
    }
  }, [debts, selectedId]);

  useEffect(() => {
    setName(selected?.name ?? '');
    setPrincipalBalance(selected ? String(selected.principal_balance) : '');
    setAprPercent(selected ? String(selected.interest_rate_apr) : '');
    setMinimumPayment(selected ? String(selected.minimum_payment) : '');
  }, [selected?.id]);

  async function saveName() {
    if (!selected || !name.trim() || name.trim() === selected.name) return;
    await updateDebt.mutateAsync({ id: selected.id, patch: { name: name.trim() } });
    show('Debt renamed');
  }

  async function savePrincipal() {
    if (!selected) return;
    const parsed = parseFloat(principalBalance);
    const next = Number.isFinite(parsed) ? parsed : 0;
    setPrincipalBalance(String(next));
    if (next === selected.principal_balance) return;
    await updateDebt.mutateAsync({ id: selected.id, patch: { principal_balance: next } });
    show('Balance updated');
  }

  async function saveApr() {
    if (!selected) return;
    const parsed = parseFloat(aprPercent);
    const next = Number.isFinite(parsed) ? parsed : 0;
    setAprPercent(String(next));
    if (next === selected.interest_rate_apr) return;
    await updateDebt.mutateAsync({ id: selected.id, patch: { interest_rate_apr: next } });
  }

  async function saveMinimum() {
    if (!selected) return;
    const parsed = parseFloat(minimumPayment);
    const next = Number.isFinite(parsed) ? parsed : 0;
    setMinimumPayment(String(next));
    if (next === selected.minimum_payment) return;
    await updateDebt.mutateAsync({ id: selected.id, patch: { minimum_payment: next } });
  }

  async function setKind(kind: DebtKind) {
    if (!selected) return;
    await updateDebt.mutateAsync({ id: selected.id, patch: { kind } });
  }

  async function setLinkedAccount(accountId: number | null) {
    if (!selected) return;
    await updateDebt.mutateAsync({ id: selected.id, patch: { account_id: accountId } });
  }

  const deleteEntity = useDeleteDebt(profileId);

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function performDelete() {
    if (!selected) return;
    setDeleteOpen(false);
    await deleteEntity.mutateAsync(selected.id);
    setSelectedId(null);
    show('Debt deleted');
  }

  async function toggleArchived() {
    if (!selected) return;
    if (selected.archived) {
      await unarchiveDebt.mutateAsync(selected.id);
      show('Debt restored');
    } else {
      await archiveDebt.mutateAsync(selected.id);
      show('Debt archived');
    }
  }

  async function submitNewDebt(newName: string) {
    const id = await createDebt.mutateAsync({
      name: newName,
      kind: 'credit_card',
      principalBalance: 0,
      interestRateApr: 0,
      minimumPayment: 0,
      accountId: null,
    });
    setSelectedId(id);
    show('Debt added');
  }

  async function submitPayment(data: { amount: number; interestPortion: number; note: string }) {
    if (!selected) return;
    const principalPortion = Math.max(0, data.amount - data.interestPortion);
    await recordPayment.mutateAsync({
      debtId: selected.id,
      data: {
        amount: data.amount,
        principalPortion,
        interestPortion: data.interestPortion,
        note: data.note || null,
      },
    });
    show('Payment logged');
  }

  const activeDebts: PayoffPlanDebt[] = (debts ?? [])
    .filter((d) => !d.archived)
    .map((d) => ({
      id: d.id,
      name: d.name,
      balance: d.principal_balance,
      aprPercent: d.interest_rate_apr,
      minimumPayment: d.minimum_payment,
    }));
  const projections = computePayoffProjections(activeDebts, Number(extraPayment || 0));

  const extraRef = useRef<View>(null);

  const tour = useScreenTour(
    'Debts',
    useMemo(
      () => [
        { ref: extraRef, text: 'Put anything spare in here and the payoff order below works out what it buys you.' },
      ],
      []
    )
  );

  return (
    <Screen tour={tour} onBack={() => navigation.goBack()} topBarTitle="Debts" scroll={false}>
      <SectionLabel number="10" label="DEBTS" title="Plan the payoff" />

      <View ref={extraRef} collapsable={false} className="rounded-3xl border border-border bg-card px-5 pt-[18px] pb-[18px] mb-4">
        <Text variant="mono" className="text-[9px] tracking-widest text-faint">
          EXTRA PAYMENT PER MONTH · {symbol}
        </Text>
        <TextInput
          value={extraPayment}
          onChangeText={setExtraPayment}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          style={{
            marginTop: 6,
            height: 28,
            padding: 0,
            color: colors.textPrimary,
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 18,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
        />

        <View className="flex-row mt-4 pt-4 border-t border-border" style={{ gap: 16 }}>
          <PlanList title="SNOWBALL — SMALLEST FIRST" result={projections?.snowball ?? null} symbol={symbol} />
          <PlanList title="AVALANCHE — HIGHEST APR FIRST" result={projections?.avalanche ?? null} symbol={symbol} />
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{ width: 112 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(debts ?? []).map((d: Debt) => {
              const active = d.id === selectedId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedId(d.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: active ? colors.cardInset : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.borderStrong : 'transparent',
                    opacity: d.archived ? 0.4 : 1,
                  }}
                >
                  <Text
                    style={{ fontSize: 11, fontWeight: '600', color: active ? colors.textPrimary : colors.textMuted }}
                    numberOfLines={2}
                  >
                    {d.name}
                  </Text>
                  <Text variant="mono" className="text-[9px] text-faint mt-1">
                    {formatAmount(d.principal_balance, symbol)}
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
              ) : null}

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
                  PRINCIPAL BALANCE · {symbol}
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
                    value={principalBalance}
                    onChangeText={setPrincipalBalance}
                    onBlur={savePrincipal}
                    onSubmitEditing={savePrincipal}
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
                      APR %
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
                        value={aprPercent}
                        onChangeText={setAprPercent}
                        onBlur={saveApr}
                        onSubmitEditing={saveApr}
                        keyboardType="decimal-pad"
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
                      MIN. PAYMENT · {symbol}
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
                        value={minimumPayment}
                        onChangeText={setMinimumPayment}
                        onBlur={saveMinimum}
                        onSubmitEditing={saveMinimum}
                        keyboardType="decimal-pad"
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
                  KIND
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(Object.keys(KIND_LABEL) as DebtKind[]).map((k) => (
                    <Pill
                      key={k}
                      label={KIND_LABEL[k]}
                      size="sm"
                      active={selected.kind === k}
                      activeColor={colors.textPrimary}
                      onPress={() => setKind(k)}
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
                    onPress={() => setLinkedAccount(null)}
                  />
                  {(accounts ?? []).map((a) => (
                    <Pill
                      key={a.id}
                      label={a.name.toUpperCase()}
                      size="sm"
                      active={selected.account_id === a.id}
                      activeColor={a.color}
                      onPress={() => setLinkedAccount(a.id)}
                    />
                  ))}
                </View>
              </View>

              <CTAButton
                label="LOG PAYMENT"
                className="mt-6"
                onPress={() => setPaymentSheetOpen(true)}
                disabled={!!selected.archived}
              />

              <CTAButton
                label={selected.archived ? 'RESTORE DEBT' : 'ARCHIVE DEBT'}
                variant={selected.archived ? 'solid' : 'danger'}
                className="mt-3"
                onPress={toggleArchived}
              />
              <CTAButton label="DELETE DEBT" variant="danger" className="mt-3" onPress={() => setDeleteOpen(true)} />
<ConfirmDialog
  visible={deleteOpen}
  title="Delete debt"
  message={`Permanently delete "${selected.name}" and its payment history? This cannot be undone.`}
  confirmLabel="DELETE"
  onConfirm={performDelete}
  onCancel={() => setDeleteOpen(false)}
/>
              <Text variant="mono" className="text-[10px] text-faint mt-3 leading-4">
                {selected.archived
                  ? 'Restoring brings it back into the payoff plan. Its payment history is unaffected either way.'
                  : 'Archiving drops it from the payoff plan. Its payment history is kept.'}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="label">No debts yet — add one to start tracking payoff.</Text>
          )}
        </View>
      </View>

      {selected ? (
        <DebtPaymentSheet
          isOpen={paymentSheetOpen}
          onClose={() => setPaymentSheetOpen(false)}
          debtName={selected.name}
          currencySymbol={symbol}
          onSubmit={submitPayment}
        />
      ) : null}

      <AddItemSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="NEW DEBT"
        placeholder="e.g. Visa card"
        onSubmit={submitNewDebt}
      />
    </Screen>
  );
}
