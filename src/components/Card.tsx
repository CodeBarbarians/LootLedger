import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface CardProps extends ViewProps {
  inset?: boolean;
}

export function Card({ style, inset, ...rest }: CardProps) {
  return <View style={[styles.card, inset && styles.inset, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  inset: {
    backgroundColor: colors.cardInset,
  },
});
