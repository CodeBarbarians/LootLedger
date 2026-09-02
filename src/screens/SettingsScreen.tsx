import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Pressable, View } from 'react-native';
import { CTAButton } from '../components/app/CTAButton';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { useToast } from '../components/app/Toast';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useActiveProfile, useUpdateProfile } from '../hooks/useProfiles';
import { useResetToDefaultBudget } from '../hooks/useReset';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = TabScreenProps<'Settings'>;

function Row({
  title,
  subtitle,
  value,
  valueColor,
  onPress,
  last,
}: {
  title: string;
  subtitle: string;
  value: string;
  valueColor?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className={`flex-row justify-between items-center px-[18px] py-4 ${last ? '' : 'border-b border-border'}`}
    >
      <View>
        <Text style={{ fontSize: 13, fontWeight: '600' }}>{title}</Text>
        <Text variant="mono" className="text-[10px] text-faint mt-1">
          {subtitle}
        </Text>
      </View>
      <Text variant="mono" className="font-mono-bold text-xs" style={{ color: valueColor ?? colors.textPrimary }}>
        {value}
      </Text>
    </Wrapper>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { data: profile } = useActiveProfile();
  const { data: currentPeriod } = useCurrentPeriod(profile?.id, profile?.cycle_start_day ?? 1);
  const { data: settings } = useSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const resetToDefault = useResetToDefaultBudget(profile?.id as number);
  const { show } = useToast();
  const symbol = profile?.currency_symbol ?? 'Rs';

  function toggleMode() {
    if (!profile) return;
    updateProfile.mutate({
      id: profile.id,
      patch: { budget_mode: profile.budget_mode === 'percent' ? 'amount' : 'percent' },
    });
  }

  function toggleTheme() {
    if (!settings) return;
    updateSettings.mutate({ theme_mode: settings.theme_mode === 'light' ? 'dark' : 'light' });
  }

  async function toggleBiometricLock() {
    if (!settings) return;
    const enabling = !settings.biometric_lock_enabled;
    if (enabling) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Not available', 'This device has no biometric hardware.');
        return;
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'Not set up',
          'Set up a fingerprint, face, or device passcode in your phone settings first, then try again.'
        );
        return;
      }
    }
    updateSettings.mutate({ biometric_lock_enabled: enabling ? 1 : 0 });
  }

  function confirmReset() {
    Alert.alert(
      'Reset to Default Budget',
      'This deletes every category, month, and transaction and reseeds the default budget. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetToDefault.mutateAsync();
            show('Default budget restored');
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <SectionLabel number="05" label="SETTINGS" title="Rules" />

      <View className="rounded-[20px] border border-border bg-card overflow-hidden">
        <Row
          title="Currency"
          subtitle={profile?.currency_code === 'PKR' ? 'Pakistani Rupee' : profile?.currency_code ?? ''}
          value={profile?.currency_code ?? ''}
          valueColor={colors.accent}
        />
        <Row
          title="Monthly salary"
          subtitle="Tap to edit in setup"
          value={formatAmount(profile?.salary_amount ?? 0, symbol)}
          onPress={() =>
            navigation.navigate(
              'BudgetSetup',
              currentPeriod ? { mode: 'edit', periodId: currentPeriod.id } : { mode: 'newMonth' }
            )
          }
        />
        <Row
          title="Budget mode"
          subtitle="Applies to every category"
          value={profile?.budget_mode === 'percent' ? '% MODE' : 'RS MODE'}
          valueColor={colors.accent}
          onPress={toggleMode}
        />
        <Row
          title="Leftover at month end"
          subtitle="Unspent budget behaviour"
          value="TO SAVINGS"
          valueColor={colors.success}
        />
        <Row
          title="Overspending"
          subtitle="Goes negative, tracked in history"
          value="ALLOWED"
          valueColor={colors.danger}
          last
        />
      </View>

      <View className="rounded-[20px] border border-border bg-card overflow-hidden mt-4">
        <Row
          title="Budget profiles"
          subtitle="Switch, rename, or add a budget"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('BudgetProfiles')}
        />
        <Row
          title="Master data"
          subtitle="Categories, accounts, debts, bills, goals"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('MasterData')}
          last
        />
      </View>

      <View className="rounded-[20px] border border-border bg-card overflow-hidden mt-4">
        <Row
          title="Theme"
          subtitle="Dark or light peach"
          value={settings?.theme_mode === 'light' ? 'LIGHT' : 'DARK'}
          valueColor={colors.accent}
          onPress={toggleTheme}
        />
        <Row
          title="App lock"
          subtitle="Require fingerprint or face to open"
          value={settings?.biometric_lock_enabled ? 'ON' : 'OFF'}
          valueColor={settings?.biometric_lock_enabled ? colors.success : colors.textMuted}
          onPress={toggleBiometricLock}
          last
        />
      </View>

      <CTAButton label="RESET TO DEFAULT BUDGET" variant="danger" className="mt-4" onPress={confirmReset} />

      <View className="flex-row items-center gap-2.5 mt-8 pt-5 border-t border-divider">
        <Text variant="mono" className="text-[10px] text-faint leading-4">
          CODE BARBARIANS{'\n'}Budget · v1.0 · local-only
        </Text>
      </View>
    </Screen>
  );
}
