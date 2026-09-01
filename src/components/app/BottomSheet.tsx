import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@/components/ui/actionsheet';
import { Text } from './Text';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-card border-t border-border-strong px-5 pt-5 rounded-t-[28px]" style={{ paddingBottom: 0 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
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
        </KeyboardAvoidingView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
