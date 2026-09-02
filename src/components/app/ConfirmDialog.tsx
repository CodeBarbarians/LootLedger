import { Modal, Pressable, View } from 'react-native';
import { colors } from '../../theme';
import { CTAButton } from './CTAButton';
import { Text } from './Text';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation in the app's own language rather than the platform's — the stock
 * Alert is a system dialog and reads as if it belongs to Android, not here.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'CANCEL',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping the scrim cancels, matching what people expect of a dialog. */}
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.66)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        {/* Swallows presses so a tap inside the card does not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 26,
            padding: 22,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 24 }} className="font-heading">
            {title}
          </Text>
          <Text variant="label" className="mt-2.5 leading-5">
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <CTAButton label={cancelLabel} variant="outline" className="flex-1" onPress={onCancel} />
            <CTAButton label={confirmLabel} variant="danger" className="flex-1" onPress={onConfirm} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
