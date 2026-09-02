import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@/components/ui/actionsheet';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { Text } from './Text';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // The sheet is overlay content, so Android's window resize never reaches it and
  // KeyboardAvoidingView has nothing to avoid against — it sat *under* the
  // keyboard. Lifting it by the keyboard's own height is what actually works.
  const keyboardHeight = useKeyboardHeight();

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent
        className="bg-card border-t border-border-strong px-5 pt-5 rounded-t-[28px]"
        style={{ paddingBottom: keyboardHeight }}
      >
        <View style={{ width: '100%' }}>
          <View style={{ paddingBottom: 28 }}>
            <ActionsheetDragIndicatorWrapper>
              <ActionsheetDragIndicator />
            </ActionsheetDragIndicatorWrapper>
            <View className="w-full flex-row items-center justify-between mt-1">
              <Text variant="monoLabel">{title}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text variant="mono" className="text-sm">
                  ✕
                </Text>
              </Pressable>
            </View>
            {children}
          </View>
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}
