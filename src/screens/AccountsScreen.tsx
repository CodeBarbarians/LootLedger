import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { AddItemSheet } from '../components/app/AddItemSheet';
import { Bar } from '../components/app/Bar';
import { CTAButton } from '../components/app/CTAButton';
import { Pill } from '../components/app/Pill';
import { Ring } from '../components/app/Ring';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { StatCell } from '../components/app/StatCell';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import type { Account, AccountType } from '../db/types';
import {
  useAccounts,
  useArchiveAccount,
  useCreateAccount,
  useNetWorth,
  useNetWorthTrend,
  useUnarchiveAccount,
  useUpdateAccount,
  useUpdateAccountBalance,
} from '../hooks/useAccounts';
import { useActiveProfile } from '../hooks/useProfiles';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors, useThemeRepaint } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'Accounts'>;

const TYPE_LABEL: Record<AccountType, string> = {
  checking: 'CHECKING',
  savings: 'SAVINGS',
  credit_card: 'CREDIT CARD',
  cash: 'CASH',
  investment: 'INVESTMENT',
  loan: 'LOAN',
  other: 'OTHER',
};

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function monthKeyLabel(monthKey: string): string {
  const [, month] = monthKey.split('-');
  return MONTH_LABELS[parseInt(month, 10) - 1] ?? monthKey;
}

export function AccountsScreen({ navigation }: Props) {
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const profileId = profile?.id as number;
  const symbol = profile?.currency_symbol ?? 'Rs';
  const { data: accounts } = useAccounts(profileId, true);
  const { data: netWorth } = useNetWorth(profileId);
  const { data: trend } = useNetWorthTrend(profileId);
  const createAccount = useCreateAccount(profileId);
  const updateAccount = useUpdateAccount(profileId);
  const updateBalance = useUpdateAccountBalance(profileId);
  const archiveAccount = useArchiveAccount(profileId);
  const unarchiveAccount = useUnarchiveAccount(profileId);
  const { show } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const selected = accounts?.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && accounts && accounts.length > 0) {
      setSelectedId(accounts[0].id);
    }
  }, [accounts, selectedId]);

  useEffect(() => {
    setName(selected?.name ?? '');
    setBalance(selected ? String(selected.current_balance) : '');
  }, [selected?.id]);

  async function saveName() {
    if (!selected || !name.trim() || name.trim() === selected.name) return;
    await updateAccount.mutateAsync({ id: selected.id, patch: { name: name.trim() } });
    show('Account renamed');
  }

  async function saveBalance() {
    if (!selected) return;
    const parsed = parseFloat(balance);
    const nextBalance = Number.isFinite(parsed) ? parsed : 0;
    setBalance(String(nextBalance));
    if (nextBalance === selected.current_balance) return;
    await updateBalance.mutateAsync({ id: selected.id, balance: nextBalance });
    show('Balance updated');
  }

  async function setColor(color: string) {
    if (!selected) return;
    await updateAccount.mutateAsync({ id: selected.id, patch: { color } });
  }

  async function setType(type: AccountType) {
    if (!selected) return;
    await updateAccount.mutateAsync({ id: selected.id, patch: { type } });
  }

  async function setLiability(isLiability: boolean) {
    if (!selected) return;
    await updateAccount.mutateAsync({ id: selected.id, patch: { is_liability: isLiability ? 1 : 0 } });
  }

  async function toggleArchived() {
    if (!selected) return;
    if (selected.archived) {
      await unarchiveAccount.mutateAsync(selected.id);
      show('Account restored');
    } else {
      await archiveAccount.mutateAsync(selected.id);
      show('Account archived');
    }
  }

  async function submitNewAccount(newName: string) {
    const color = CATEGORY_PALETTE[(accounts?.length ?? 0) % CATEGORY_PALETTE.length];
    const id = await createAccount.mutateAsync({
      name: newName,
      type: 'checking',
      color,
      isLiability: false,
      currentBalance: 0,
    });
    setSelectedId(id);
    show('Account added');
  }

  const maxTrendAbs = Math.max(1, ...(trend ?? []).map((p) => Math.abs(p.netWorth)));
  const equityRatio = netWorth && netWorth.assets > 0 ? netWorth.netWorth / netWorth.assets : 0;
  const ringColor = (netWorth?.netWorth ?? 0) < 0 ? colors.danger : colors.accent;

  return (
    <Screen onBack={() => navigation.goBack()} topBarTitle="Accounts" scroll={false}>
      <SectionLabel number="09" label="ACCOUNTS" title="Track your net worth" />

      <View className="rounded-3xl border border-border bg-card px-5 pt-[22px] pb-[18px] mb-4">
        <View className="flex-row items-center gap-[18px]">
          <Ring
            fraction={equityRatio}
            color={ringColor}
            label={`${Math.round(Math.max(0, Math.min(1, equityRatio)) * 100)}%`}
            sublabel="EQUITY"
          />
          <View className="flex-1 min-w-0">
            <Text variant="mono" className="text-[9px] tracking-[3px] text-faint">
              NET WORTH
            </Text>
            <Text
              className="mt-1"
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 28,
                lineHeight: 34,
                letterSpacing: -0.4,
                color: (netWorth?.netWorth ?? 0) < 0 ? colors.danger : colors.textPrimary,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatAmount(netWorth?.netWorth ?? 0, symbol)}
            </Text>
          </View>
        </View>

        <View className="flex-row mt-5 pt-4 border-t border-border">
          <StatCell label="ASSETS" value={formatAmount(netWorth?.assets ?? 0, symbol)} className="flex-1" />
          <StatCell
            label="LIABILITIES"
            value={formatAmount(netWorth?.liabilities ?? 0, symbol)}
            color={colors.danger}
            className="flex-1 pl-3 border-l border-border"
          />
        </View>

        {trend && trend.length > 0 ? (
          <View className="mt-5 pt-4 border-t border-border">
            <Text variant="mono" className="text-[9px] tracking-widest text-faint mb-3">
              LAST {trend.length} MONTHS
            </Text>
            {trend.map((p) => (
              <View key={p.monthKey} className="flex-row items-center gap-2.5 mb-2">
                <Text variant="mono" className="text-[9px] text-faint" style={{ width: 28 }}>
                  {monthKeyLabel(p.monthKey)}
                </Text>
                <View className="flex-1">
                  <Bar
                    fraction={Math.abs(p.netWorth) / maxTrendAbs}
                    color={p.netWorth < 0 ? colors.danger : colors.accent}
                  />
                </View>
                <Text variant="mono" className="font-mono-bold text-[9px]" style={{ width: 70, textAlign: 'right' }}>
                  {formatAmount(p.netWorth, symbol)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{ width: 112 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(accounts ?? []).map((a: Account) => {
              const active = a.id === selectedId;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setSelectedId(a.id)}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 10,
                    paddingLeft: 10,
                    paddingRight: 8,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: active ? colors.cardInset : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.borderStrong : 'transparent',
                    opacity: a.archived ? 0.4 : 1,
                  }}
                >
                  <View style={{ width: 3, borderRadius: 2, marginRight: 8, backgroundColor: a.color }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', lineHeight: 15, color: active ? colors.textPrimary : colors.textMuted }}
                      numberOfLines={2}
                    >
                      {a.name}
                    </Text>
                    <Text variant="mono" className="text-[9px] text-faint mt-1">
                      {formatAmount(a.current_balance, symbol)}
                    </Text>
                  </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: selected.color }} />
                <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 23, flex: 1 }} className="font-heading" numberOfLines={1}>
                  {selected.name}
                </Text>
              </View>
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
                  CURRENT BALANCE · {symbol}
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
                    value={balance}
                    onChangeText={setBalance}
                    onBlur={saveBalance}
                    onSubmitEditing={saveBalance}
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

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  COLOR
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {CATEGORY_PALETTE.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: c,
                        borderWidth: selected.color === c ? 3 : 0,
                        borderColor: colors.textPrimary,
                      }}
                    />
                  ))}
                </View>

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  TYPE
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                    <Pill
                      key={t}
                      label={TYPE_LABEL[t]}
                      size="sm"
                      active={selected.type === t}
                      onPress={() => setType(t)}
                    />
                  ))}
                </View>

                <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                  COUNTS AS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Pill
                    label="ASSET"
                    size="sm"
                    active={!selected.is_liability}
                    activeColor={colors.success}
                    onPress={() => setLiability(false)}
                  />
                  <Pill
                    label="LIABILITY"
                    size="sm"
                    active={!!selected.is_liability}
                    activeColor={colors.danger}
                    onPress={() => setLiability(true)}
                  />
                </View>
              </View>

              <CTAButton
                label={selected.archived ? 'RESTORE ACCOUNT' : 'ARCHIVE ACCOUNT'}
                variant={selected.archived ? 'solid' : 'danger'}
                className="mt-6"
                onPress={toggleArchived}
              />
              <Text variant="mono" className="text-[10px] text-faint mt-3 leading-4">
                {selected.archived
                  ? 'Restoring brings it back into your net worth. Its balance history is unaffected either way.'
                  : 'Archiving drops it from net worth and future tracking. Its balance history is kept.'}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="label">No accounts yet — add one to start tracking net worth.</Text>
          )}
        </View>
      </View>

      <AddItemSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="NEW ACCOUNT"
        placeholder="e.g. Checking"
        onSubmit={submitNewAccount}
      />
    </Screen>
  );
}
