import { Pressable, View } from 'react-native';
import { colors } from '../../theme';
import { Text } from './Text';

interface TopBarProps {
  onBack: () => void;
  title?: string;
}

export function TopBar({ onBack, title }: TopBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: 20,
        paddingTop: 8,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingRight: 8 }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
          ‹
        </Text>
        <Text variant="mono" className="font-mono-bold text-[11px] text-muted-foreground">
          BACK
        </Text>
      </Pressable>
      {title ? (
        <Text variant="subheading" className="flex-1 ml-1" numberOfLines={1}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}
