import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, View } from 'react-native';
import { Screen } from '../components/app/Screen';
import { SectionLabel } from '../components/app/SectionLabel';
import { Text } from '../components/app/Text';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

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
  return (
    <Screen onBack={() => navigation.goBack()} topBarTitle="Master data">
      <SectionLabel number="08" label="MASTER DATA" title="Manage the basics" />

      {/* Each entity type below gets its own Row, navigating to its own management screen. */}
      <View className="rounded-[20px] border border-border bg-card overflow-hidden">
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
          last
        />
      </View>
    </Screen>
  );
}
