import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { CTAButton } from './CTAButton';
import { Text } from './Text';
import { colors } from '../../theme';

interface AddItemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void | Promise<void>;
}

export function AddItemSheet({
  isOpen,
  onClose,
  title,
  placeholder = 'e.g. Groceries',
  submitLabel = 'ADD',
  onSubmit,
}: AddItemSheetProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
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
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={submit}
          style={{
            marginTop: 6,
            height: 26,
            padding: 0,
            color: colors.textPrimary,
            fontFamily: 'SpaceGrotesk_600SemiBold',
            fontSize: 18,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
        />
      </View>

      <CTAButton label={submitLabel} className="mt-3.5" loading={submitting} onPress={submit} />
    </BottomSheet>
  );
}
