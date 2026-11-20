import React, { useRef } from 'react';
import { Host, Slider } from '@expo/ui/swift-ui';
import { accessibilityLabel as accessibilityLabelModifier } from '@expo/ui/swift-ui/modifiers';
import { colors } from '../../theme/colors';
import type { StopSliderProps } from './StopSlider.types';

/**
 * Native SwiftUI slider snapped to stops — the thumb turns to Liquid Glass while
 * dragged on iOS 26, with the system's own tick at each stop.
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
          // No extra haptic: the native slider already ticks at each step on iOS 26,
          // and a second one on top felt excessive.
          onChange(i);
        }}
        modifiers={accessibilityLabel ? [accessibilityLabelModifier(accessibilityLabel)] : []}
      />
    </Host>
  );
}
