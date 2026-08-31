import { StyleSheet, View } from 'react-native';
import { colors, fontFamily, radius, spacing } from '../theme';
import { Text } from './Text';

interface SectionHeaderProps {
  number: string;
  title: string;
  subtitle?: string;
}

export function SectionHeader({ number, title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text variant="mono" color={colors.accent} style={styles.badgeText}>
          {number}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subheading">{title}</Text>
        {subtitle ? (
          <Text variant="label" color={colors.textMuted} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 12,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
});
