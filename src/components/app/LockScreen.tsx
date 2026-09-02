import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CTAButton } from './CTAButton';
import { Text } from './Text';
import { colors } from '../../theme';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [authenticating, setAuthenticating] = useState(false);
  const [message, setMessage] = useState('Verify your identity to continue.');

  async function attemptUnlock() {
    setAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware) {
        setMessage('This device has no biometric hardware — turn off the app lock in Settings.');
        return;
      }
      if (!isEnrolled) {
        setMessage('No fingerprint, face, or device passcode is set up on this device.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LootLedger',
      });
      if (result.success) {
        onUnlock();
      } else {
        setMessage('Authentication was canceled. Tap unlock to try again.');
      }
    } finally {
      setAuthenticating(false);
    }
  }

  useEffect(() => {
    attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <Text
        style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}
        className="font-heading"
      >
        LootLedger is locked
      </Text>
      <Text variant="label" style={{ textAlign: 'center', marginBottom: 28 }}>
        {message}
      </Text>
      <CTAButton label="UNLOCK" onPress={attemptUnlock} loading={authenticating} />
    </View>
  );
}
