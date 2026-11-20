import React from 'react';
import { I18nManager, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Host, Button, Text, HStack, ProgressView, Image } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  buttonBorderShape,
  controlSize,
  disabled as disabledModifier,
  font,
  frame,
  labelStyle,
  accessibilityLabel as accessibilityLabelModifier,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';
import { colors } from '../../theme/colors';
import type {
  GlassButtonProps,
  GlassCircleButtonProps,
  GlassIconButtonProps,
} from './GlassButton.types';

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
      colorScheme="light"
      // glassProminent always draws a white label, so tint with the deeper orange
      // (white on it is 5.2:1; on the bright brand orange only 2.8:1).
      seedColor={
        prominent
          ? color === colors.primary ? colors.primaryDark : color
          : color === colors.primary ? colors.text : color
      }
      layoutDirection={I18nManager.isRTL ? 'rightToLeft' : 'leftToRight'}
      style={[fullWidth && { width: '100%' }, disabled && !loading && { opacity: 0.45 }, style] as StyleProp<ViewStyle>}
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
          <Text
            modifiers={[
              font({ weight: 'semibold', size: 17 }),
            ]}
          >
            {title}
          </Text>
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
  color = colors.text,
  style,
}: GlassIconButtonProps) {
  return (
    <Host matchContents colorScheme="light" seedColor={color} style={style}>
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

/** Big round glass button for game actions (pass / like). */
export function GlassCircleButton({
  systemImage,
  onPress,
  accessibilityLabel,
  size = 72,
  prominent = false,
  color = colors.primary,
  iconColor = colors.text,
  style,
}: GlassCircleButtonProps) {
  // The glass adds its own padding around the label; size the label so the
  // finished circle lands on `size`.
  const inner = Math.round(size * 0.62);
  return (
    <Host matchContents colorScheme="light" seedColor={prominent ? color : undefined} style={style}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(prominent ? 'glassProminent' : 'glass'),
          buttonBorderShape('circle'),
          accessibilityLabelModifier(accessibilityLabel),
        ]}
      >
        <Image
          systemName={systemImage as SFSymbol}
          size={Math.round(size * 0.36)}
          color={iconColor}
          modifiers={[frame({ width: inner, height: inner })]}
        />
      </Button>
    </Host>
  );
}
