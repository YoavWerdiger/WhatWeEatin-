import React, { useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Host, Slider } from '@expo/ui/swift-ui';
import { accessibilityLabel as accessibilityLabelModifier } from '@expo/ui/swift-ui/modifiers';
import { colors } from '../../theme/colors';
import type { StopSliderProps } from './StopSlider.types';

/**
 * Native SwiftUI slider snapped to stops — the thumb turns to Liquid Glass while
 * dragged on iOS 26. One selection tick per stop crossed, as it's crossed.
 * Tinted through the Host's seedColor (a ShapeStyle tint is ignored here).
 */
export function StopSlider({ count, index, onChange, accessibilityLabel }: StopSliderProps) {
  const last = useRef(index);
  return (
    <Host matchContents={{ vertical: true }} colorScheme="light" seedColor={colors.primary} style={{ width: '100%' }}>
      <Slider
        value={index}
        min={0}
        max={count - 1}
        step={1}
        onValueChange={(v) => {
          const i = Math.round(v);
          if (i === last.current) return;
          last.current = i;
          void Haptics.selectionAsync();
          onChange(i);
        }}
        modifiers={accessibilityLabel ? [accessibilityLabelModifier(accessibilityLabel)] : []}
      />
    </Host>
  );
}
