import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '../../theme/colors';
import { borderRadius as radii } from '../../theme/spacing';

// Native iOS 26 Liquid Glass (UIGlassEffect in Swift, via expo-glass-effect).
// No blur imitation: anywhere real glass isn't available we render an honest solid surface.
const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();
const GLASS_SETTLE_MS = 300;

interface GlassProps extends ViewProps {
  radius?: number;
  /** 'clear' lets more of what's behind show through — use over photos. */
  variant?: 'regular' | 'clear';
  /** iOS 26 touch response (shimmer + squish). Only for pressable glass. */
  interactive?: boolean;
  tint?: string;
  /** Sits on a dark photo — the solid fallback goes dark to match. */
  dark?: boolean;
  /** Glass appearance. Light everywhere except over photos, where dark keeps white text legible. */
  scheme?: 'light' | 'dark';
}

export function Glass({
  radius = radii.xl,
  variant = 'regular',
  interactive = false,
  tint,
  dark = false,
  scheme = 'light',
  style,
  children,
  ...rest
}: GlassProps) {
  const shape = { borderRadius: radius, borderCurve: 'continuous' as const };
  // expo-glass-effect can skip the effect when the view mounts before it has been laid out,
  // or while an ancestor is still animating in (screen/step entrances fade from opacity 0).
  // Hold a solid look-alike until layout + a beat past the usual entrance (~240ms), then mount glass.
  const [laidOut, setLaidOut] = useState(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!LIQUID || !laidOut) return;
    const id = setTimeout(() => setSettled(true), GLASS_SETTLE_MS);
    return () => clearTimeout(id);
  }, [laidOut]);

  if (LIQUID && !settled) {
    return (
      <View
        style={[shape, dark ? styles.solidDark : styles.solid, tint ? { backgroundColor: tint } : null, style]}
        onLayout={laidOut ? undefined : () => setLaidOut(true)}
        {...rest}
      >
        {children}
      </View>
    );
  }

  if (LIQUID) {
    return (
      <GlassView
        colorScheme={scheme}
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
