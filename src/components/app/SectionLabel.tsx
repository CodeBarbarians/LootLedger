import { View } from 'react-native';
import { Text } from './Text';

interface SectionLabelProps {
  number: string;
  label: string;
  title: string;
}

/** The "01 — SETUP / Allot the money" numbered screen-title pattern used throughout the app. */
export function SectionLabel({ number, label, title }: SectionLabelProps) {
  return (
    <View className="mb-4">
      <Text variant="monoLabel" className="text-primary">
        {number} — {label}
      </Text>
      <Text variant="display" className="mt-1.5">
        {title}
      </Text>
    </View>
  );
}
