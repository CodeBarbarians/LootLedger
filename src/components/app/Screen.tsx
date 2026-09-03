import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Dimensions,
  StyleSheet,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type KeyboardEvent,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Mascot } from './Mascot';
import { Text } from './Text';
import { TopBar } from './TopBar';
import type { ScreenTour } from './tour';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  onBack?: () => void;
  topBarTitle?: string;
  /** Floats above the screen's content without scrolling with it, and never takes touches. */
  overlay?: ReactNode;
  /**
   * This screen's walkthrough, from `useScreenTour`. Given one, the screen grows a
   * `?` control and hosts the mascot that presents it — the scroll view lives here,
   * so this is the only place that can bring each step into view.
   */
  tour?: ScreenTour;
  /**
   * The slot this screen's own header logo sits in, if it has one. The mark is
   * hidden there while it is out presenting, and starts from here, so there is
   * only ever one logo on screen.
   */
  tourOrigin?: RefObject<View | null>;
}

/** Gap left between the focused field and the top of the keyboard. */
const FOCUS_MARGIN = 24;

/**
 * How long a step's scroll is given to land before the mascot goes to it. The
 * reveal resolves on this timer whatever the measurements do — a walkthrough must
 * never stall on a `measureInWindow` that never comes back.
 */
const REVEAL_MS = 460;

/** Where a step is parked in the viewport: high enough to leave room for the bubble. */
const REVEAL_BIAS = 0.28;

export function Screen({
  scroll = true,
  onBack,
  topBarTitle,
  overlay,
  tour,
  tourOrigin,
  children,
  ...rest
}: ScreenProps) {
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

  // Scrolls a walkthrough step into view before the mascot travels to it, so a
  // tour can cover a whole screen rather than only what happened to be above the
  // fold. Derived from geometry the same way the keyboard handler above is, for
  // the same reason: a tracked scroll offset reads stale after a native scroll.
  const reveal = useCallback(
    (ref: RefObject<View | null>) =>
      new Promise<void>((resolve) => {
        const settle = setTimeout(resolve, REVEAL_MS);
        const view = scrollRef.current;
        const container = containerRef.current;
        const content = contentRef.current;
        const node = ref.current;
        if (!scroll || !view || !container || !content || !node) {
          clearTimeout(settle);
          resolve();
          return;
        }
        container.measureInWindow((_viewX, viewY, _viewWidth, viewHeight) => {
          content.measureInWindow((_contentX, contentY) => {
            node.measureInWindow((_nodeX, nodeY) => {
              const currentOffset = viewY - contentY;
              const parkAt = viewY + viewHeight * REVEAL_BIAS;
              const delta = nodeY - parkAt;
              // Already close enough to where it wants it — a scroll of a few
              // points reads as a twitch and is not worth the animation.
              if (Math.abs(delta) > 24) {
                view.scrollTo({ y: Math.max(currentOffset + delta, 0), animated: true });
              }
            });
          });
        });
      }),
    [scroll]
  );

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
        {overlay ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {overlay}
          </View>
        ) : null}
        {tour && tour.steps.length > 0 ? (
          <>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Mascot
                origin={tourOrigin}
                tour={{
                  running: tour.running,
                  steps: tour.steps,
                  onDone: tour.finish,
                  reveal,
                }}
              />
            </View>
            {/* Hidden while it is playing: the way out of a running walkthrough is
                to wait it out or leave the screen, not to restart it. */}
            {tour.running ? null : (
              <Pressable
                onPress={tour.start}
                hitSlop={10}
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.card,
                }}
              >
                <Text
                  variant="mono"
                  className="font-mono-bold"
                  style={{ fontSize: 12, color: colors.textSecondary }}
                >
                  ?
                </Text>
              </Pressable>
            )}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
