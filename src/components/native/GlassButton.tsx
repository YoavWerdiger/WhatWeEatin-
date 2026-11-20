import React from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { PressableScale } from '../ui/PressableScale';
import { colors } from '../../theme/colors';
import type { GlassButtonProps, GlassIconButtonProps } from './GlassButton.types';

// Android / web: SwiftUI glass isn't available, so use the app's own button.

export function GlassButton({
  title,
  onPress,
  prominent = true,
  disabled,
  loading,
  fullWidth = true,
  style,
}: GlassButtonProps) {
  return (
    <Button
      title={title}
      onPress={onPress}
      variant={prominent ? 'primary' : 'secondary'}
      size="lg"
      disabled={disabled}
      loading={loading}
      fullWidth={fullWidth}
      style={StyleSheet.flatten(style) ?? undefined}
    />
  );
}

const SF_TO_IONICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'chevron.backward': I18nManager.isRTL ? 'chevron-forward' : 'chevron-back',
  xmark: 'close',
  'square.and.arrow.up': 'share-outline',
  'doc.on.doc': 'copy-outline',
};

export function GlassIconButton({
  systemImage,
  onPress,
  accessibilityLabel,
  size = 44,
  color = colors.text,
  style,
}: GlassIconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.94}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: size / 2 },
        color !== colors.text && styles.iconOnDark,
        style,
      ]}
    >
      <Ionicons name={SF_TO_IONICONS[systemImage] ?? 'ellipse'} size={size * 0.45} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconOnDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'transparent',
  },
});
