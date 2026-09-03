import * as LocalAuthentication from 'expo-local-authentication';
import { useMemo, useRef, useState, type Ref } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { CTAButton } from '../components/app/CTAButton';
import { ConfirmDialog } from '../components/app/ConfirmDialog';
import { Screen } from '../components/app/Screen';
import { useScreenTour } from '../components/app/tour';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import { runThemeTransition } from '../components/app/themeTransition';
import { useToast } from '../components/app/Toast';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useActiveProfile, useUpdateProfile } from '../hooks/useProfiles';
import { useResetToDefaultBudget } from '../hooks/useReset';
import { useSetThemeMode, useSettings, useUpdateSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors, useThemeRepaint } from '../theme';
import { formatAmount } from '../utils/currency';

type Props = TabScreenProps<'Settings'>;

function Row({
  title,
  subtitle,
  value,
  valueColor,
  onPress,
  last,
  innerRef,
}: {
  title: string;
  subtitle: string;
  value: string;
  valueColor?: string;
  onPress?: () => void;
  last?: boolean;
  innerRef?: Ref<View>;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      ref={innerRef}
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
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const { data: currentPeriod } = useCurrentPeriod(profile?.id, profile?.cycle_start_day ?? 1);
  const { data: settings } = useSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const setThemeMode = useSetThemeMode();
  const resetToDefault = useResetToDefaultBudget(profile?.id as number);
  const { show } = useToast();
  const symbol = profile?.currency_symbol ?? 'Rs';
  const themeRowRef = useRef<View>(null);

  function toggleMode() {
    if (!profile) return;
    updateProfile.mutate({
      id: profile.id,
      patch: { budget_mode: profile.budget_mode === 'percent' ? 'amount' : 'percent' },
    });
  }

  function toggleTheme() {
    if (!settings) return;
    const next = settings.theme_mode === 'light' ? 'dark' : 'light';
    // The write is deferred to the peak of the transition, so the theme flips
    // while the singularity covers the screen.
    runThemeTransition(themeRowRef, next, () => setThemeMode(next));
  }

  // Clears the record of which walkthroughs have played, so each screen offers
  // its own again the next time it is opened.
  function replayTutorials() {
    updateSettings.mutate({ tours_seen: '[]' });
    show('Tutorials will play again');
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

  const [resetOpen, setResetOpen] = useState(false);

  async function performReset() {
    setResetOpen(false);
    await resetToDefault.mutateAsync();
    show('Default budget restored');
  }

  const rulesRef = useRef<View>(null);
  const navRef = useRef<View>(null);
  const appRef = useRef<View>(null);

  const tour = useScreenTour(
    'Settings',
    useMemo(
      () => [
        { ref: rulesRef, text: 'The rules your budget runs on. Salary and mode are the two that change the maths.' },
        { ref: navRef, text: 'Switch between budgets, or manage the categories, accounts, debts, bills and goals behind them.' },
        { ref: appRef, text: 'Theme and app lock. Replay tutorials is here too, if you want the walkthroughs back.' },
      ],
      []
    )
  );

  return (
    <Screen tour={tour}>
      <SectionLabel number="05" label="SETTINGS" title="Rules" />

      <View ref={rulesRef} collapsable={false} className="rounded-[20px] border border-border bg-card overflow-hidden">
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

      <View ref={navRef} collapsable={false} className="rounded-[20px] border border-border bg-card overflow-hidden mt-4">
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

      <View ref={appRef} collapsable={false} className="rounded-[20px] border border-border bg-card overflow-hidden mt-4">
        <Row
          innerRef={themeRowRef}
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
        />
        <Row
          title="Replay tutorials"
          subtitle="Play every screen's walkthrough again"
          value="RESET"
          valueColor={colors.accent}
          onPress={replayTutorials}
          last
        />
      </View>

      <CTAButton label="RESET TO DEFAULT BUDGET" variant="danger" className="mt-4" onPress={() => setResetOpen(true)} />
      <ConfirmDialog
        visible={resetOpen}
        title="Reset to default budget"
        message="This deletes every category, month and transaction, then reseeds the default budget. This cannot be undone."
        confirmLabel="RESET"
        onConfirm={performReset}
        onCancel={() => setResetOpen(false)}
      />

      <View className="flex-row items-center gap-2.5 mt-8 pt-5 border-t border-divider">
        <Text variant="mono" className="text-[10px] text-faint leading-4">
          CODE BARBARIANS{'\n'}Budget · v1.0 · local-only
        </Text>
      </View>
    </Screen>
  );
}
