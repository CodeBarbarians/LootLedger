import { Pressable, View } from 'react-native';
import { Text } from './Text';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

interface NumberPadProps {
  onPress: (key: string) => void;
}

export function NumberPad({ onPress }: NumberPadProps) {
  return (
    <View className="mt-3.5 flex-row flex-wrap gap-2">
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => onPress(k)}
          className="items-center justify-center rounded-2xl border border-border bg-background py-4 active:border-primary"
          style={{ width: '31.8%' }}
        >
          <Text variant="mono" className="font-mono-bold text-lg text-foreground">
            {k === 'del' ? '⌫' : k}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
