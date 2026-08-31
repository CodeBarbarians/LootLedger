import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { colors, spacing } from '../theme';

interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function ScreenContainer({ scroll = true, padded = true, style, children, ...rest }: ScreenContainerProps) {
  const content = (
    <View style={[padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
