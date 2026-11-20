import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '../../theme/colors';
import { borderRadius as radii } from '../../theme/spacing';

// Native iOS 26 Liquid Glass (UIGlassEffect in Swift, via expo-glass-effect).
// No blur imitation: anywhere real glass isn't available we render an honest solid surface.
const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface GlassProps extends ViewProps {
  radius?: number;
  /** 'clear' lets more of what's behind show through — use over photos. */
  variant?: 'regular' | 'clear';
  /** iOS 26 touch response (shimmer + squish). Only for pressable glass. */
  interactive?: boolean;
  tint?: string;
  /** Sits on a dark photo — the solid fallback goes dark to match. */
  dark?: boolean;
}

export function Glass({
  radius = radii.xl,
  variant = 'regular',
  interactive = false,
  tint,
  dark = false,
  style,
  children,
  ...rest
}: GlassProps) {
  const shape = { borderRadius: radius, borderCurve: 'continuous' as const };

  if (LIQUID) {
    return (
      <GlassView
        colorScheme="light"
        glassEffectStyle={variant}
        isInteractive={interactive}
        tintColor={tint}
        style={[shape, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        shape,
        dark ? styles.solidDark : styles.solid,
        tint ? { backgroundColor: tint } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export const isLiquidGlass = LIQUID;

const styles = StyleSheet.create({
  solid: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  solidDark: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
