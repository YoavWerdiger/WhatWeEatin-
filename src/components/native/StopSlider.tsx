import React, { useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Slider } from '@expo/ui/community/slider';
import { colors } from '../../theme/colors';
import type { StopSliderProps } from './StopSlider.types';

export function StopSlider({ count, index, onChange, accessibilityLabel }: StopSliderProps) {
  const last = useRef(index);
  return (
    <Slider
      value={index}
      minimumValue={0}
      maximumValue={count - 1}
      step={1}
      minimumTrackTintColor={colors.primary}
      thumbTintColor={colors.primary}
      accessibilityLabel={accessibilityLabel}
      onValueChange={(v) => {
        const i = Math.round(v);
        if (i === last.current) return;
        last.current = i;
        void Haptics.selectionAsync();
        onChange(i);
      }}
      style={{ width: '100%' }}
    />
  );
}
