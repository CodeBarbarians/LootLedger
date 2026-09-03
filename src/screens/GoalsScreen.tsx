import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AddItemSheet } from '../components/app/AddItemSheet';
import { Bar } from '../components/app/Bar';
import { CTAButton } from '../components/app/CTAButton';
import { ConfirmDialog } from '../components/app/ConfirmDialog';
import { GoalContributionSheet } from '../components/app/GoalContributionSheet';
import { Screen } from '../components/app/Screen';
import { useScreenTour } from '../components/app/tour';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import type { GoalWithProgress } from '../db/types';
import {
  useAddContribution,
  useArchiveGoal,
  useCreateGoal,
  useGoalContributions,
  useGoalsWithProgress,
  useUnarchiveGoal,
  useUpdateGoal,
  useDeleteGoal,
} from '../hooks/useGoals';
import { useActiveProfile } from '../hooks/useProfiles';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors, useThemeRepaint } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'Goals'>;

export function GoalsScreen({ navigation }: Props) {
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const profileId = profile?.id as number;
  const symbol = profile?.currency_symbol ?? 'Rs';
  const { data: goals } = useGoalsWithProgress(profileId, true);
  const createGoal = useCreateGoal(profileId);
  const updateGoal = useUpdateGoal(profileId);
  const archiveGoal = useArchiveGoal(profileId);
  const unarchiveGoal = useUnarchiveGoal(profileId);
  const addContribution = useAddContribution(profileId);
  const { show } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [contributionSheetOpen, setContributionSheetOpen] = useState(false);

  const selected = goals?.find((g) => g.id === selectedId) ?? null;
  const { data: contributions } = useGoalContributions(selected?.id);

  useEffect(() => {
    if (!selectedId && goals && goals.length > 0) {
      setSelectedId(goals[0].id);
    }
  }, [goals, selectedId]);

  useEffect(() => {
    setName(selected?.name ?? '');
    setTargetAmount(selected ? String(selected.target_amount) : '');
    setTargetDate(selected?.target_date ?? '');
  }, [selected?.id]);

  async function saveName() {
    if (!selected || !name.trim() || name.trim() === selected.name) return;
    await updateGoal.mutateAsync({ id: selected.id, patch: { name: name.trim() } });
    show('Goal renamed');
  }

  async function saveTargetAmount() {
    if (!selected) return;
    const parsed = parseFloat(targetAmount);
    const next = Number.isFinite(parsed) ? parsed : 0;
    setTargetAmount(String(next));
    if (next === selected.target_amount) return;
    await updateGoal.mutateAsync({ id: selected.id, patch: { target_amount: next } });
    show('Target updated');
  }

  async function saveTargetDate() {
    if (!selected) return;
    const next = targetDate.trim() || null;
    if (next === selected.target_date) return;
    await updateGoal.mutateAsync({ id: selected.id, patch: { target_date: next } });
  }

  async function setColor(color: string) {
    if (!selected) return;
    await updateGoal.mutateAsync({ id: selected.id, patch: { color } });
  }

  const deleteEntity = useDeleteGoal(profileId);

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function performDelete() {
    if (!selected) return;
    setDeleteOpen(false);
    await deleteEntity.mutateAsync(selected.id);
    setSelectedId(null);
    show('Goal deleted');
  }

  async function toggleArchived() {
    if (!selected) return;
    if (selected.archived) {
      await unarchiveGoal.mutateAsync(selected.id);
      show('Goal restored');
    } else {
      await archiveGoal.mutateAsync(selected.id);
      show('Goal archived');
    }
  }

  async function submitNewGoal(newName: string) {
    const color = CATEGORY_PALETTE[(goals?.length ?? 0) % CATEGORY_PALETTE.length];
    const id = await createGoal.mutateAsync({
      name: newName,
      targetAmount: 0,
      targetDate: null,
      color,
    });
    setSelectedId(id);
    show('Goal added');
  }

  async function submitContribution(data: { amount: number; note: string }) {
    if (!selected) return;
    await addContribution.mutateAsync({
      goalId: selected.id,
      data: { amount: data.amount, note: data.note || null },
    });
    show('Contribution added');
  }

  const fraction = selected && selected.target_amount > 0 ? selected.contributed / selected.target_amount : 0;
  const reached = selected ? selected.contributed >= selected.target_amount && selected.target_amount > 0 : false;

  const splitRef = useRef<View>(null);

  const tour = useScreenTour(
    'Goals',
    useMemo(
      () => [
        { ref: splitRef, text: 'Something you are saving towards. Contribute to one and the bar on your dashboard follows.' },
      ],
      []
    )
  );

  return (
    <Screen tour={tour} onBack={() => navigation.goBack()} topBarTitle="Goals" scroll={false}>
      <SectionLabel number="12" label="GOALS" title="Save toward something" />

      <View ref={splitRef} collapsable={false} style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{ width: 112 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(goals ?? []).map((g: GoalWithProgress) => {
              const active = g.id === selectedId;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setSelectedId(g.id)}
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
                    opacity: g.archived ? 0.4 : 1,
                  }}
                >
                  <View style={{ width: 3, borderRadius: 2, marginRight: 8, backgroundColor: g.color }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', lineHeight: 15, color: active ? colors.textPrimary : colors.textMuted }}
                      numberOfLines={2}
                    >
                      {g.name}
                    </Text>
                    <Text variant="mono" className="text-[9px] text-faint mt-1">
                      {formatAmount(g.contributed, symbol)}
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
              <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 23 }} className="font-heading" numberOfLines={1}>
                {selected.name}
              </Text>
              {selected.archived ? (
                <Text variant="mono" className="text-[10px] text-faint mt-1">
                  ARCHIVED
                </Text>
              ) : null}

              <View style={{ marginTop: 14 }}>
                <Bar fraction={fraction} color={reached ? colors.success : selected.color} height={8} />
                <View className="flex-row justify-between mt-2">
                  <Text variant="mono" className="text-[10px] text-faint">
                    {formatAmount(selected.contributed, symbol)} saved
                  </Text>
                  <Text variant="mono" className="text-[10px] text-faint">
                    {formatAmount(selected.target_amount, symbol)} target
                  </Text>
                </View>
                {reached ? (
                  <Text variant="mono" className="text-[10px] mt-2" style={{ color: colors.success }}>
                    TARGET REACHED
                  </Text>
                ) : null}
              </View>

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

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="mono" className="text-[9px] tracking-widest text-faint">
                      TARGET AMOUNT · {symbol}
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
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        onBlur={saveTargetAmount}
                        onSubmitEditing={saveTargetAmount}
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
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text variant="mono" className="text-[9px] tracking-widest text-faint">
                      TARGET DATE
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
                        value={targetDate}
                        onChangeText={setTargetDate}
                        onBlur={saveTargetDate}
                        onSubmitEditing={saveTargetDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.placeholder}
                        style={{
                          height: 40,
                          padding: 0,
                          color: colors.textPrimary,
                          fontFamily: 'SpaceMono_700Bold',
                          fontSize: 13,
                          includeFontPadding: false,
                          textAlignVertical: 'center',
                        }}
                      />
                    </View>
                  </View>
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
              </View>

              <CTAButton
                label="ADD CONTRIBUTION"
                className="mt-6"
                onPress={() => setContributionSheetOpen(true)}
                disabled={!!selected.archived}
              />

              {(contributions ?? []).length > 0 ? (
                <>
                  <Text variant="mono" className="text-[9px] tracking-widest text-faint mt-6">
                    CONTRIBUTIONS
                  </Text>
                  {(contributions ?? []).map((c) => (
                    <View key={c.id} className="flex-row items-center justify-between mt-2.5">
                      <View className="flex-1 min-w-0 mr-3">
                        <Text style={{ fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                          {c.note || 'Contribution'}
                        </Text>
                        <Text variant="mono" className="text-[9px] text-faint mt-0.5">
                          {new Date(c.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text variant="mono" className="font-mono-bold text-xs" style={{ color: colors.success }}>
                        +{formatAmount(c.amount, symbol)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              <CTAButton
                label={selected.archived ? 'RESTORE GOAL' : 'ARCHIVE GOAL'}
                variant={selected.archived ? 'solid' : 'danger'}
                className="mt-6"
                onPress={toggleArchived}
              />
              <CTAButton label="DELETE GOAL" variant="danger" className="mt-3" onPress={() => setDeleteOpen(true)} />
<ConfirmDialog
  visible={deleteOpen}
  title="Delete goal"
  message={`Permanently delete "${selected.name}" and its contributions? This cannot be undone.`}
  confirmLabel="DELETE"
  onConfirm={performDelete}
  onCancel={() => setDeleteOpen(false)}
/>
              <Text variant="mono" className="text-[10px] text-faint mt-3 leading-4">
                {selected.archived
                  ? 'Restoring brings it back into your active goals. Its contribution history is unaffected either way.'
                  : 'Archiving hides it from your active goals. Its contribution history is kept.'}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="label">No goals yet — add one to start saving.</Text>
          )}
        </View>
      </View>

      {selected ? (
        <GoalContributionSheet
          isOpen={contributionSheetOpen}
          onClose={() => setContributionSheetOpen(false)}
          goalName={selected.name}
          currencySymbol={symbol}
          onSubmit={submitContribution}
        />
      ) : null}

      <AddItemSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="NEW GOAL"
        placeholder="e.g. Emergency fund"
        onSubmit={submitNewGoal}
      />
    </Screen>
  );
}
