import React from 'react';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';

export type ModeType = 'light' | 'dark' | 'system';

/**
 * Modified from the generated gluestack provider: it used to call
 * `Appearance.setColorScheme(mode)` from an effect here. AppGate now owns that,
 * setting it in the same commit as the palette so NativeWind's className colours
 * and the inline `colors` ones flip together. Driving it from this prop meant
 * threading the mode down from the app root, which re-rendered the entire tree a
 * second time on every theme change. Re-add nothing here if this file is
 * regenerated — set the colour scheme where the theme is applied instead.
 */
export function GluestackUIProvider({
  mode: _mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  return (
    <View
      style={[
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
