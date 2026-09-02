import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { CTAButton } from '../components/app/CTAButton';
import { Pill } from '../components/app/Pill';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import type { BudgetProfile } from '../db/types';
import {
  useActiveProfile,
  useArchiveProfile,
  useProfiles,
  useUnarchiveProfile,
  useUpdateProfile,
} from '../hooks/useProfiles';
import { useSetActiveProfile } from '../hooks/useSettings';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BudgetProfiles'>;

export function BudgetProfilesScreen({ navigation }: Props) {
  const { data: profiles } = useProfiles(true);
  const { data: activeProfile } = useActiveProfile();
  const updateProfile = useUpdateProfile();
  const archiveProfile = useArchiveProfile();
  const unarchiveProfile = useUnarchiveProfile();
  const setActiveProfile = useSetActiveProfile();
  const queryClient = useQueryClient();
  const { show } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [cycleStartDay, setCycleStartDay] = useState('1');

  const selected = profiles?.find((p) => p.id === selectedId) ?? null;
  const isActive = !!selected && selected.id === activeProfile?.id;
  const activeCount = profiles?.filter((p) => !p.archived).length ?? 0;

  useEffect(() => {
    if (!selectedId && profiles && profiles.length > 0) {
      setSelectedId(activeProfile?.id ?? profiles[0].id);
    }
  }, [profiles, selectedId, activeProfile]);

  useEffect(() => {
    setName(selected?.name ?? '');
    setCycleStartDay(String(selected?.cycle_start_day ?? 1));
  }, [selected?.id]);

  async function saveName() {
    if (!selected || !name.trim() || name.trim() === selected.name) return;
    await updateProfile.mutateAsync({ id: selected.id, patch: { name: name.trim() } });
    show('Profile renamed');
  }

  async function saveCycleStartDay() {
    if (!selected) return;
    const day = Math.min(28, Math.max(1, parseInt(cycleStartDay, 10) || 1));
    setCycleStartDay(String(day));
    if (day === selected.cycle_start_day) return;
    await updateProfile.mutateAsync({ id: selected.id, patch: { cycle_start_day: day } });
    show('Cycle start day updated');
  }

  async function setCurrency(code: string, symbol: string) {
    if (!selected) return;
    await updateProfile.mutateAsync({ id: selected.id, patch: { currency_code: code, currency_symbol: symbol } });
  }

  async function setColor(color: string) {
    if (!selected) return;
    await updateProfile.mutateAsync({ id: selected.id, patch: { color } });
  }

  async function switchToSelected() {
    if (!selected || isActive) return;
    await setActiveProfile.mutateAsync(selected.id);
    queryClient.invalidateQueries();
    show(`Switched to ${selected.name}`);
  }

  async function toggleArchived() {
    if (!selected) return;
    if (selected.archived) {
      await unarchiveProfile.mutateAsync(selected.id);
      show('Profile restored');
    } else {
      await archiveProfile.mutateAsync(selected.id);
      show('Profile archived');
      setSelectedId(null);
    }
  }

  const canArchive = !!selected && !selected.archived && !isActive && activeCount > 1;

  return (
    <Screen onBack={() => navigation.goBack()} topBarTitle="Budget profiles" scroll={false}>
      <SectionLabel number="07" label="PROFILES" title="Manage budgets" />

      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        {/* Sidebar */}
        <View style={{ width: 104 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(profiles ?? []).map((p: BudgetProfile) => {
              const active = p.id === selectedId;
              const isCurrentActive = p.id === activeProfile?.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedId(p.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: active ? colors.cardInset : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.borderStrong : 'transparent',
                    opacity: p.archived ? 0.4 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} />
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', flex: 1, color: active ? colors.textPrimary : colors.textMuted }}
                      numberOfLines={2}
                    >
                      {p.name}
                    </Text>
                  </View>
                  {isCurrentActive ? (
                    <Text variant="mono" className="text-[8px] tracking-wider text-primary mt-1">
                      ACTIVE
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => navigation.navigate('BudgetSetup', { mode: 'newProfile' })}
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

        {/* Detail panel */}
        <View style={{ flex: 1 }}>
          {selected ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selected.color }} />
                <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 23, flex: 1 }} className="font-heading" numberOfLines={1}>
                  {selected.name}
                </Text>
              </View>
              {isActive ? (
                <Text variant="mono" className="text-[10px] text-primary mt-1">
                  CURRENTLY ACTIVE
                </Text>
              ) : selected.archived ? (
                <Text variant="mono" className="text-[10px] text-faint mt-1">
                  ARCHIVED
                </Text>
              ) : null}

              <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
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
                CURRENCY
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {CURRENCY_OPTIONS.map((c) => (
                  <Pill
                    key={c.code}
                    label={`${c.symbol} ${c.label}`}
                    size="sm"
                    active={selected.currency_code === c.code}
                    onPress={() => setCurrency(c.code, c.symbol)}
                  />
                ))}
              </View>

              <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-5">
                CYCLE START DAY
              </Text>
              <View
                style={{
                  marginTop: 6,
                  height: 36,
                  width: 72,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: colors.background,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={cycleStartDay}
                  onChangeText={setCycleStartDay}
                  onBlur={saveCycleStartDay}
                  onSubmitEditing={saveCycleStartDay}
                  keyboardType="number-pad"
                  style={{
                    height: 36,
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

              {!isActive ? (
                <CTAButton
                  label="SWITCH TO THIS PROFILE"
                  className="mt-6"
                  loading={setActiveProfile.isPending}
                  onPress={switchToSelected}
                />
              ) : null}

              {!selected.archived ? (
                <CTAButton
                  label="ARCHIVE PROFILE"
                  variant="danger"
                  className="mt-3"
                  disabled={!canArchive}
                  onPress={toggleArchived}
                />
              ) : (
                <CTAButton label="RESTORE PROFILE" className="mt-3" onPress={toggleArchived} />
              )}
              <Text variant="mono" className="text-[10px] text-faint mt-3 leading-4">
                {selected.archived
                  ? 'Restoring brings this profile back, with all of its history intact.'
                  : isActive
                    ? 'Switch to another profile before archiving this one.'
                    : activeCount <= 1
                      ? 'You need at least one active budget profile.'
                      : 'Archiving hides it everywhere. Its categories, months, and transactions are kept.'}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="label">No budget profiles yet — add one to get started.</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
