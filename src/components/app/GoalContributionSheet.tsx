import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { CTAButton } from './CTAButton';
import { Text } from './Text';
import { colors } from '../../theme';

interface GoalContributionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  goalName: string;
  currencySymbol: string;
  onSubmit: (data: { amount: number; note: string }) => void | Promise<void>;
}

export function GoalContributionSheet({
  isOpen,
  onClose,
  goalName,
  currencySymbol,
  onSubmit,
}: GoalContributionSheetProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
    }
  }, [isOpen]);

  async function submit() {
    const parsedAmount = Number(amount || 0);
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ amount: parsedAmount, note: note.trim() });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="ADD CONTRIBUTION">
      <Text variant="label" className="mt-2.5 leading-5">
        Logs a contribution toward {goalName || 'this goal'} and adds it to the amount saved.
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
          AMOUNT · {currencySymbol}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          style={{
            marginTop: 6,
            height: 26,
            padding: 0,
            color: colors.textPrimary,
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 18,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
        />
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
          NOTE (OPTIONAL)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. bonus payout"
          placeholderTextColor={colors.placeholder}
          style={{
            marginTop: 6,
            height: 26,
            padding: 0,
            color: colors.textPrimary,
            fontFamily: 'SpaceGrotesk_500Medium',
            fontSize: 16,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
        />
      </View>

      <CTAButton label="ADD CONTRIBUTION" className="mt-3.5" loading={submitting} onPress={submit} />
    </BottomSheet>
  );
}
