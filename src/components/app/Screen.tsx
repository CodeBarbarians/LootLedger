import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from './TopBar';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  onBack?: () => void;
  topBarTitle?: string;
}

export function Screen({ scroll = true, onBack, topBarTitle, children, ...rest }: ScreenProps) {
  const content = (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: onBack ? 4 : 16,
        paddingBottom: scroll ? 112 : 16,
        flex: scroll ? undefined : 1,
      }}
      {...rest}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {onBack ? <TopBar onBack={onBack} title={topBarTitle} /> : null}
      {scroll ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
