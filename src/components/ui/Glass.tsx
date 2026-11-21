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

  if (LIQUID) {
    // One stable tree: the glass is a background layer that appears once settled, so the
    // children are never re-mounted (swapping View → GlassView made whole steps jump).
    return (
      <View
        style={[shape, settled ? null : [dark ? styles.solidDark : styles.solid, tint ? { backgroundColor: tint } : null], style]}
        onLayout={laidOut ? undefined : () => setLaidOut(true)}
        {...rest}
      >
        {settled ? (
          <GlassView
            colorScheme={scheme}
            glassEffectStyle={variant}
            isInteractive={interactive}
            tintColor={tint}
            style={[StyleSheet.absoluteFill, shape]}
          />
        ) : null}
        {/* Interactive glass needs the touch itself (shimmer + squish): content lets it through.
            The Pressable around the Glass still gets the press. */}
        {interactive ? (
          <View style={[styles.content, contentLayout(style)]} pointerEvents="none">
            {children}
          </View>
        ) : (
          children
        )}
      </View>
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

/** The wrapper of interactive content repeats the Glass's own flex layout so children lay out the same. */
function contentLayout(style: ViewProps['style']) {
  const f = StyleSheet.flatten(style) ?? {};
  return {
    flexDirection: f.flexDirection,
    alignItems: f.alignItems,
    justifyContent: f.justifyContent,
    gap: f.gap,
    rowGap: f.rowGap,
    columnGap: f.columnGap,
    flexWrap: f.flexWrap,
  };
}

export const isLiquidGlass = LIQUID;

const styles = StyleSheet.create({
  solid: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  content: { flexGrow: 1, alignSelf: 'stretch' },
  solidDark: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
