import { useEffect, useState } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { CTAButton } from './CTAButton';
import { Text } from './Text';
import { colors } from '../../theme';

interface DebtPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  debtName: string;
  currencySymbol: string;
  onSubmit: (data: { amount: number; interestPortion: number; note: string }) => void | Promise<void>;
}

export function DebtPaymentSheet({
  isOpen,
  onClose,
  debtName,
  currencySymbol,
  onSubmit,
}: DebtPaymentSheetProps) {
  const [amount, setAmount] = useState('');
  const [interestPortion, setInterestPortion] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setInterestPortion('');
      setNote('');
    }
  }, [isOpen]);

  async function submit() {
    const parsedAmount = Number(amount || 0);
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        interestPortion: Number(interestPortion || 0),
        note: note.trim(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="LOG PAYMENT">
      <Text variant="label" className="mt-2.5 leading-5">
        Records a payment against {debtName || 'this debt'} and reduces its balance by the principal
        portion.
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
          AMOUNT PAID · {currencySymbol}
        </Text>
        <TextInputLike value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" mono size={18} bold />
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
          OF WHICH INTEREST (OPTIONAL) · {currencySymbol}
        </Text>
        <TextInputLike
          value={interestPortion}
          onChangeText={setInterestPortion}
          placeholder="0"
          keyboardType="decimal-pad"
          mono
          size={18}
          bold
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
        <TextInputLike value={note} onChangeText={setNote} placeholder="e.g. extra payment" size={16} />
      </View>

      <CTAButton label="LOG PAYMENT" className="mt-3.5" loading={submitting} onPress={submit} />
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
