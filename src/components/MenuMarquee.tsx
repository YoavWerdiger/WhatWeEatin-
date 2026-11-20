import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const THUMB = 64;
const GAP = 10;
const SPEED = 28; // px per second — a slow conveyor, not a race

/** "Tonight's menu": the loaded restaurants drift past while the table fills up. */
export function MenuMarquee({ images, label }: { images: string[]; label: string }) {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const list = images.slice(0, 12);
  const stripW = list.length * (THUMB + GAP);

  useEffect(() => {
    if (reduceMotion || list.length === 0) return;
    x.set(0);
    x.set(withRepeat(withTiming(-stripW, { duration: (stripW / SPEED) * 1000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [reduceMotion, stripW]);

  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  if (list.length === 0) return null;

  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.window}>
        {/* Two copies back to back so the loop is seamless */}
        <Animated.View style={[styles.strip, strip]}>
          {[...list, ...list].map((uri, i) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumb} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { ...typography.footnote, color: colors.textSecondary, paddingHorizontal: spacing.md },
  window: { height: THUMB, overflow: 'hidden' },
  strip: { flexDirection: 'row', gap: GAP, paddingStart: spacing.md, direction: 'ltr' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.borderLight,
    borderWidth: 3,
    borderColor: colors.surface,
  },
});
