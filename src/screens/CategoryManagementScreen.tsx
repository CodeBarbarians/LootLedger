import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { CTAButton } from '../components/app/CTAButton';
import { Pill } from '../components/app/Pill';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import type { Category, CategoryKind } from '../db/types';
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useUnarchiveCategory,
  useUpdateCategory,
} from '../hooks/useCategories';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryManagement'>;

const KIND_LABEL: Record<CategoryKind, string> = {
  expense: 'EXPENSE',
  debt: 'DEBT',
  saving: 'SAVING',
};

const KIND_COLOR: Record<CategoryKind, string> = {
  expense: colors.textPrimary,
  debt: colors.danger,
  saving: colors.success,
};

export function CategoryManagementScreen({ navigation }: Props) {
  const { data: categories } = useCategories(true);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const archiveCategory = useArchiveCategory();
  const unarchiveCategory = useUnarchiveCategory();
  const { show } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const selected = categories?.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && categories && categories.length > 0) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  useEffect(() => {
    setName(selected?.name ?? '');
  }, [selected?.id]);

  async function saveName() {
    if (!selected || !name.trim() || name.trim() === selected.name) return;
    await updateCategory.mutateAsync({ id: selected.id, patch: { name: name.trim() } });
    show('Category renamed');
  }

  async function setColor(color: string) {
    if (!selected) return;
    await updateCategory.mutateAsync({ id: selected.id, patch: { color } });
  }

  async function setKind(kind: CategoryKind) {
    if (!selected) return;
    await updateCategory.mutateAsync({ id: selected.id, patch: { kind } });
  }

  async function toggleArchived() {
    if (!selected) return;
    if (selected.archived) {
      await unarchiveCategory.mutateAsync(selected.id);
      show('Category restored');
    } else {
      await archiveCategory.mutateAsync(selected.id);
      show('Category archived');
    }
  }

  async function submitNewCategory() {
    if (!newName.trim()) return;
    const color = CATEGORY_PALETTE[(categories?.length ?? 0) % CATEGORY_PALETTE.length];
    const id = await createCategory.mutateAsync({ name: newName.trim(), color, kind: 'expense' });
    setNewName('');
    setCreating(false);
    setSelectedId(id);
    show('Category added');
  }

  return (
    <Screen onBack={() => navigation.goBack()} topBarTitle="Categories" scroll={false}>
      <SectionLabel number="06" label="CATEGORIES" title="Manage categories" />

      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        {/* Sidebar */}
        <View style={{ width: 104 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(categories ?? []).map((c: Category) => {
              const active = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedId(c.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: active ? colors.cardInset : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.borderStrong : 'transparent',
                    opacity: c.archived ? 0.4 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.color }} />
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', flex: 1, color: active ? colors.textPrimary : colors.textMuted }}
                      numberOfLines={2}
                    >
                      {c.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {creating ? (
              <View style={{ marginTop: 4 }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Name"
                  placeholderTextColor={colors.placeholder}
                  autoFocus
                  onSubmitEditing={submitNewCategory}
                  style={{
                    height: 32,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    color: colors.textPrimary,
                    fontFamily: 'SpaceGrotesk_500Medium',
                    fontSize: 12,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  }}
                />
                <Pressable onPress={submitNewCategory} style={{ marginTop: 6 }}>
                  <Text variant="mono" className="font-mono-bold text-[10px] text-primary" style={{ textAlign: 'center' }}>
                    ADD
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setCreating(true)}
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
            )}
          </ScrollView>
        </View>

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
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => (
                  <Pill
                    key={k}
                    label={KIND_LABEL[k]}
                    size="sm"
                    active={selected.kind === k}
                    activeColor={KIND_COLOR[k]}
                    onPress={() => setKind(k)}
                  />
                ))}
              </View>

              <CTAButton
                label={selected.archived ? 'RESTORE CATEGORY' : 'ARCHIVE CATEGORY'}
                variant={selected.archived ? 'solid' : 'danger'}
                className="mt-6"
                onPress={toggleArchived}
              />
              <Text variant="mono" className="text-[10px] text-faint mt-3 leading-4">
                {selected.archived
                  ? 'Restoring brings it back for new months. Past history is unaffected either way.'
                  : 'Archiving hides it from future months. Existing history and data are kept.'}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="label">No categories yet — add one to get started.</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
