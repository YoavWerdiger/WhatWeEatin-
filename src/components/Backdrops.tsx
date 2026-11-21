import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MOCK_RESTAURANTS } from '../utils/mockData';
import { colors } from '../theme/colors';

// The ambient backdrops besides HomeMosaic, so each screen family has its own:
//   PlateOrbit — round dish photos floating around the top (sign-in)

const { width: W, height: H } = Dimensions.get('window');
const PHOTOS = MOCK_RESTAURANTS.map((r) => r.image.replace(/w=\d+/, 'w=500'));
const BG = colors.background;
const BG_CLEAR = 'rgba(242,242,247,0)';

function useLoop(duration: number, delay = 0) {
  const reduceMotion = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(v);
  }, [reduceMotion, duration, delay, v]);
  return v;
}

/* ───────────── PlateOrbit ───────────── */

// Positions as fractions of the area; sizes in points. Hand-placed so nothing sits behind the centre text.
const PLATES = [
  { x: 0.08, y: 0.1, size: 92 },
  { x: 0.7, y: 0.04, size: 112 },
  { x: 0.82, y: 0.38, size: 78 },
  { x: -0.06, y: 0.48, size: 104 },
  { x: 0.4, y: 0.0, size: 64 },
  { x: 0.58, y: 0.62, size: 70 },
  { x: 0.16, y: 0.74, size: 60 },
];

function Plate({ p, i, uri }: { p: (typeof PLATES)[number]; i: number; uri: string }) {
  const t = useLoop(5200 + i * 700, i * 400);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -10 + 20 * t.value },
      { rotate: `${(i % 2 ? -1 : 1) * (4 - 8 * t.value)}deg` },
    ],
  }));
  return (
    <Animated.View
      entering={FadeIn.delay(120 * i).duration(500)}
      style={[styles.plate, { left: p.x * W, top: p.y * H * 0.55, width: p.size, height: p.size, borderRadius: p.size / 2 }, style]}
    >
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
    </Animated.View>
  );
}

/** Round dish photos bobbing around the top of the screen, over a faint orange wash. */
export function PlateOrbit({ heightRatio = 0.6, photos }: { heightRatio?: number; photos?: string[] }) {
  const pool = photos?.length ? photos : PHOTOS;
  // A fresh set each visit
  const picks = useMemo(() => {
    const start = Math.floor(Math.random() * pool.length);
    return PLATES.map((_, i) => pool[(start + i * 3) % pool.length]);
  }, [pool]);
  return (
    <View style={[styles.fill, { height: H * heightRatio }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(255,107,53,0.22)', 'rgba(255,179,71,0.12)', BG_CLEAR]}
        style={StyleSheet.absoluteFill}
      />
      {PLATES.map((p, i) => (
        <Plate key={i} p={p} i={i} uri={picks[i]} />
      ))}
      <LinearGradient colors={[BG_CLEAR, BG_CLEAR, BG]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0 },
  plate: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: colors.primaryMuted,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
