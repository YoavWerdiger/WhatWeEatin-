import React from 'react';
import { I18nManager, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Host, Button, Text, HStack, ProgressView } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  buttonBorderShape,
  controlSize,
  disabled as disabledModifier,
  font,
  frame,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';
import { colors } from '../../theme/colors';
import type { GlassButtonProps, GlassIconButtonProps } from './GlassButton.types';

const FILL = 2000; // SwiftUI .infinity stand-in — the Host clamps it to its own width

/** Native SwiftUI button: `.glassProminent` (tinted Liquid Glass) or `.glass`. */
export function GlassButton({
  title,
  onPress,
  prominent = true,
  color = colors.primary,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}: GlassButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Host
      matchContents={{ vertical: true, horizontal: !fullWidth }}
      seedColor={prominent ? color : colors.text}
      layoutDirection={I18nManager.isRTL ? 'rightToLeft' : 'leftToRight'}
      style={[fullWidth && { width: '100%' }, style] as StyleProp<ViewStyle>}
    >
      <Button
        onPress={() => {
          if (isDisabled) return;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        modifiers={[
          buttonStyle(prominent ? 'glassProminent' : 'glass'),
          buttonBorderShape('capsule'),
          controlSize('extraLarge'),
          ...(isDisabled ? [disabledModifier()] : []),
        ]}
      >
        <HStack spacing={8} modifiers={[frame(fullWidth ? { maxWidth: FILL } : {})]}>
          {loading ? <ProgressView /> : null}
          <Text modifiers={[font({ weight: 'semibold', size: 17 })]}>{title}</Text>
        </HStack>
      </Button>
    </Host>
  );
}

/** Round glass button with an SF Symbol — back, close, share. */
export function GlassIconButton({
  systemImage,
  onPress,
  accessibilityLabel,
  size = 44,
  style,
}: GlassIconButtonProps) {
  return (
    <Host matchContents seedColor={colors.text} style={style}>
      <Button
        systemImage={systemImage as SFSymbol}
        label={accessibilityLabel}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        modifiers={[
          labelStyle('iconOnly'),
          buttonStyle('glass'),
          buttonBorderShape('circle'),
          controlSize(size >= 44 ? 'large' : 'regular'),
        ]}
      />
    </Host>
  );
}
