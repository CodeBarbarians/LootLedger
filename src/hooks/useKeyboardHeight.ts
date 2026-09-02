import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Height of the on-screen keyboard, or 0 when it is closed.
 *
 * Needed because neither of Android's built-in mechanisms covers this app:
 * `adjustResize` resizes the window but never scrolls the focused field into
 * view, and it does not affect overlay content (bottom sheets) at all, which is
 * why they end up underneath the keyboard.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) =>
      setHeight(event.endCoordinates.height)
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return height;
}
