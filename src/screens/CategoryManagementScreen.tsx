import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AddItemSheet } from '../components/app/AddItemSheet';
import { CTAButton } from '../components/app/CTAButton';
import { ConfirmDialog } from '../components/app/ConfirmDialog';
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
  useDeleteCategory,
} from '../hooks/useCategories';
import { useActiveProfile } from '../hooks/useProfiles';
import type { RootStackParamList } from '../navigation/types';
import { CATEGORY_PALETTE, colors, useThemeRepaint } from '../theme';

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
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const profileId = profile?.id as number;
  const { data: categories } = useCategories(profileId, true);
  const createCategory = useCreateCategory(profileId);
  const updateCategory = useUpdateCategory(profileId);
  const archiveCategory = useArchiveCategory(profileId);
  const unarchiveCategory = useUnarchiveCategory(profileId);
  const { show } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);

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

  const deleteEntity = useDeleteCategory(profileId);

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function performDelete() {
    if (!selected || selected.is_system) return;
    setDeleteOpen(false);
    await deleteEntity.mutateAsync(selected.id);
    setSelectedId(null);
    show('Category deleted — its history moved to Uncategorized');
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

  async function submitNewCategory(newName: string) {
    const color = CATEGORY_PALETTE[(categories?.length ?? 0) % CATEGORY_PALETTE.length];
    const id = await createCategory.mutateAsync({ name: newName, color, kind: 'expense' });
    setSelectedId(id);
    show('Category added');
  }

  return (
    <Screen onBack={() => navigation.goBack()} topBarTitle="Categories" scroll={false}>
      <SectionLabel number="06" label="CATEGORIES" title="Manage categories" />

      <View style={{ flex: 1, flexDirection: 'row' }}>
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
                    flexDirection: 'row',
                    paddingVertical: 10,
                    paddingLeft: 10,
                    paddingRight: 8,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: active ? colors.cardInset : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.borderStrong : 'transparent',
                    opacity: c.archived ? 0.4 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 3,
                      borderRadius: 2,
                      marginRight: 8,
                      backgroundColor: c.color,
                    }}
                  />
                  <Text
                    style={{ fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 15, color: active ? colors.textPrimary : colors.textMuted }}
                    numberOfLines={2}
                  >
                    {c.name}
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
              </View>

              {selected.is_system ? (
                <Text variant="mono" className="text-[10px] text-faint mt-6 leading-4">
                  Uncategorized is where deleted categories move their history, so it cannot be
                  archived or deleted.
                </Text>
              ) : (
                <CTAButton
                  label={selected.archived ? 'RESTORE CATEGORY' : 'ARCHIVE CATEGORY'}
                  variant={selected.archived ? 'solid' : 'danger'}
                  className="mt-6"
                  onPress={toggleArchived}
                />
              )}
              {selected.is_system ? null : (
                <>
                  <CTAButton
                    label="DELETE CATEGORY"
                    variant="danger"
                    className="mt-3"
                    onPress={() => setDeleteOpen(true)}
                  />
                  <ConfirmDialog
                    visible={deleteOpen}
                    title="Delete category"
                    message={`Delete "${selected.name}"? Its budgets, subcategories, spending and bills move to Uncategorized — nothing is lost.`}
                    confirmLabel="DELETE"
                    onConfirm={performDelete}
                    onCancel={() => setDeleteOpen(false)}
                  />
                </>
              )}
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

      <AddItemSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="NEW CATEGORY"
        placeholder="e.g. Groceries"
        onSubmit={submitNewCategory}
      />
    </Screen>
  );
}
