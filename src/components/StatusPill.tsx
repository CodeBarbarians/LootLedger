import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Text } from './Text';

export type PillTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface StatusPillProps {
  label: string;
  tone: PillTone;
}

const toneMap: Record<PillTone, { bg: string; border: string; dot: string; text: string }> = {
  success: { bg: colors.successBg, border: colors.successBorder, dot: colors.success, text: colors.success },
  danger: { bg: colors.dangerBg, border: colors.dangerBorder, dot: colors.danger, text: colors.danger },
  warning: { bg: colors.warningBg, border: colors.warningBorder, dot: colors.warning, text: colors.warning },
  info: { bg: colors.infoBg, border: colors.infoBorder, dot: colors.info, text: colors.info },
  neutral: { bg: colors.cardInset, border: colors.border, dot: colors.textFaint, text: colors.textSecondary },
};

export function StatusPill({ label, tone }: StatusPillProps) {
  const t = toneMap[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text variant="label" color={t.text} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
