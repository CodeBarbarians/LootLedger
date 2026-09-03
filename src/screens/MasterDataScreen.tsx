import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '../components/app/Screen';
import { useScreenTour } from '../components/app/tour';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import type { RootStackParamList } from '../navigation/types';
import { colors, useThemeRepaint } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MasterData'>;

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

export function MasterDataScreen({ navigation }: Props) {
  useThemeRepaint();
  const listRef = useRef<View>(null);

  const tour = useScreenTour(
    'MasterData',
    useMemo(
      () => [
        { ref: listRef, text: 'Everything the budget is built out of. Each row opens its own screen.' },
      ],
      []
    )
  );

  return (
    <Screen tour={tour} onBack={() => navigation.goBack()} topBarTitle="Master data">
      <SectionLabel number="08" label="MASTER DATA" title="Manage the basics" />

      {/* Each entity type below gets its own Row, navigating to its own management screen. */}
      <View ref={listRef} collapsable={false} className="rounded-[20px] border border-border bg-card overflow-hidden">
        <Row
          title="Categories"
          subtitle="Rename, recolor, retype, archive"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('CategoryManagement')}
        />
        <Row
          title="Accounts"
          subtitle="Balances, net worth, archive"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('Accounts')}
        />
        <Row
          title="Debts"
          subtitle="Balances, payments, payoff plan"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('Debts')}
        />
        <Row
          title="Bills"
          subtitle="Recurring bills, due dates, mark paid"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('Bills')}
        />
        <Row
          title="Goals"
          subtitle="Savings targets, contribution log"
          value="→"
          valueColor={colors.accent}
          onPress={() => navigation.navigate('Goals')}
          last
        />
      </View>
    </Screen>
  );
}
