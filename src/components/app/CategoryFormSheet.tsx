import { useEffect, useState } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import type { CategoryKind } from '../../db/types';
import { BottomSheet } from './BottomSheet';
import { CTAButton } from './CTAButton';
import { SegmentedTabs } from './SegmentedTabs';
import { Text } from './Text';
import { colors } from '../../theme';

interface CategoryFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'category' | 'subcategory';
  parentName?: string; // for subcategory mode
  valueLabel: string; // e.g. "SHARE OF SALARY (%)" or "PLANNED AMOUNT (RS)"
  namePlaceholder: string;
  onSubmit: (data: { name: string; value: number; kind: CategoryKind }) => void | Promise<void>;
}

export function CategoryFormSheet({
  isOpen,
  onClose,
  mode,
  parentName,
  valueLabel,
  namePlaceholder,
  onSubmit,
}: CategoryFormSheetProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setValue('');
      setKind('expense');
    }
  }, [isOpen]);

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), value: Number(value || 0), kind });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'category' ? 'NEW CATEGORY' : 'NEW SUBCATEGORY'}
    >
      <Text variant="label" className="mt-2.5 leading-5">
        {mode === 'category'
          ? 'It joins the main budget and takes its share out of your salary.'
          : `Sits under ${parentName ?? 'this category'}. Mark it paid and the amount leaves the budget.`}
      </Text>

      <View
        style={{
          marginTop: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text variant="mono" className="text-[9px] tracking-widest text-faint">
          NAME
        </Text>
        <TextInputLike value={name} onChangeText={setName} placeholder={namePlaceholder} size={16} bold />
      </View>

      <View
        style={{
          marginTop: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text variant="mono" className="text-[9px] tracking-widest text-faint">
          {valueLabel}
        </Text>
        <TextInputLike value={value} onChangeText={setValue} placeholder="0" keyboardType="decimal-pad" mono size={18} bold />
      </View>

      {mode === 'category' ? (
        <SegmentedTabs
          className="mt-2.5"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'EXPENSE' },
            { value: 'saving', label: 'SAVING', activeColor: colors.success },
          ]}
        />
      ) : null}

      <CTAButton
        label={mode === 'category' ? 'ADD CATEGORY' : 'ADD SUBCATEGORY'}
        className="mt-3.5"
        loading={submitting}
        onPress={submit}
      />
    </BottomSheet>
  );
}

function TextInputLike({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  mono,
  bold,
  size,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  mono?: boolean;
  bold?: boolean;
  size: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      keyboardType={keyboardType}
      style={{
        marginTop: 6,
        height: 26,
        padding: 0,
        color: colors.textPrimary,
        fontFamily: mono ? 'SpaceMono_700Bold' : bold ? 'SpaceGrotesk_600SemiBold' : 'SpaceGrotesk_500Medium',
        fontSize: size,
        includeFontPadding: false,
        textAlignVertical: 'center',
      }}
    />
  );
}
