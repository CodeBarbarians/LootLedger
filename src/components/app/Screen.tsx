import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type KeyboardEvent,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { TopBar } from './TopBar';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  onBack?: () => void;
  topBarTitle?: string;
}

/** Gap left between the focused field and the top of the keyboard. */
const FOCUS_MARGIN = 24;

export function Screen({ scroll = true, onBack, topBarTitle, children, ...rest }: ScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const containerRef = useRef<View>(null);
  const contentRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Android resizes the window for the keyboard but does not scroll the focused
  // field into view, so anything low on a form ends up behind the keyboard. React
  // Native has no built-in for this on Android either, so the focused input is
  // measured against the scroll view and scrolled up by however much it overlaps.
  useEffect(() => {
    if (!scroll) return;
    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
      // Deferred a frame: the bottom padding added by that state change is what
      // creates the room to scroll into, so scrolling before it lands just clamps
      // at the old content height and nothing moves.
      requestAnimationFrame(() => scrollFocusedIntoView(event));
    };

    const scrollFocusedIntoView = (event: KeyboardEvent) => {
      const input = TextInput.State.currentlyFocusedInput();
      const view = scrollRef.current;
      const container = containerRef.current;
      const content = contentRef.current;
      if (!input || !view || !container || !content) return;
      // Measured in the window, so this works whether or not the window itself
      // resized — the overlap is computed against where the keyboard actually is.
      container.measureInWindow((_viewX, viewY, _viewWidth, viewHeight) => {
        const keyboardTop = Dimensions.get('window').height - event.endCoordinates.height;
        const visibleBottom = Math.min(viewY + viewHeight, keyboardTop);
        content.measureInWindow((_contentX, contentY) => {
          // Derived from geometry rather than onScroll: Android scrolls to the
          // focused field natively without emitting a scroll event, so a tracked
          // offset reads stale and scrolling to it would undo the native scroll.
          const currentOffset = viewY - contentY;
          input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
            const overlap = inputY + inputHeight + FOCUS_MARGIN - visibleBottom;
            if (overlap > 0) {
              view.scrollTo({ y: currentOffset + overlap, animated: true });
            }
          });
        });
      });
    };
    const onHide = () => setKeyboardHeight(0);
    const shown = Keyboard.addListener('keyboardDidShow', onShow);
    const hidden = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [scroll]);

  const content = (
    <View
      ref={contentRef}
      collapsable={false}
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {onBack ? <TopBar onBack={onBack} title={topBarTitle} /> : null}
      <View ref={containerRef} collapsable={false} style={{ flex: 1 }}>
        {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            // Room to scroll the last fields clear of the keyboard.
            paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
            {content}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
