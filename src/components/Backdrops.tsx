import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
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
//   Aurora     — warm colour fields drifting (create flow: calm, gives glass colour to bend)
//   PlateOrbit — round dish photos floating around the top (sign-in)
//   PhotoDrift — one photo at a time, slow zoom + crossfade (join)

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

/* ───────────── Aurora ───────────── */

const BLOBS = [
  { color: '#FF6B35', size: 1.25, x: -0.35, y: -0.2, dx: 0.25, dy: 0.12, s: 17000 },
  { color: '#FFB347', size: 1.1, x: 0.35, y: -0.05, dx: -0.2, dy: 0.15, s: 21000 },
  { color: '#FF7A90', size: 1.0, x: -0.1, y: 0.25, dx: 0.22, dy: -0.12, s: 19000 },
  { color: '#FFD3A8', size: 0.9, x: 0.45, y: 0.4, dx: -0.18, dy: -0.15, s: 23000 },
];

function Blob({ b, i }: { b: (typeof BLOBS)[number]; i: number }) {
  const t = useLoop(b.s, i * 900);
  const d = W * b.size;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (b.x + b.dx * t.value) * W },
      { translateY: (b.y + b.dy * t.value) * H * 0.6 },
      { scale: 1 + 0.12 * t.value },
    ],
  }));
  return (
    <Animated.View style={[styles.blob, { width: d, height: d, left: (W - d) / 2, top: H * 0.1 - d / 4 }, style]}>
      {/* A soft radial field — no hard circle edge */}
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={`g${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={b.color} stopOpacity={0.55} />
            <Stop offset="0.55" stopColor={b.color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={b.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={d} height={d} fill={`url(#g${i})`} />
      </Svg>
    </Animated.View>
  );
}

/** Warm colour fields drifting behind the content, fading to the page colour below `heightRatio`. */
export function Aurora({ heightRatio = 0.7 }: { heightRatio?: number }) {
  return (
    <View style={[styles.fill, { height: H * heightRatio }]} pointerEvents="none">
      {BLOBS.map((b, i) => (
        <Blob key={i} b={b} i={i} />
      ))}
      <LinearGradient colors={[BG_CLEAR, BG_CLEAR, BG]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
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

/* ───────────── PhotoDrift ───────────── */

const DRIFT_MS = 6000;

function DriftFrame({ uri }: { uri: string }) {
  const z = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!reduceMotion) z.value = withTiming(1.14, { duration: DRIFT_MS + 1200, easing: Easing.linear });
  }, [reduceMotion, z]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: z.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(1200)} exiting={FadeOut.duration(1200)} style={[StyleSheet.absoluteFill, style]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
    </Animated.View>
  );
}

/** One photo at a time, slowly zooming, crossfading to the next; washed orange and faded into the page. */
export function PhotoDrift({ heightRatio = 0.55, photos }: { heightRatio?: number; photos?: string[] }) {
  const pool = photos?.length ? photos : PHOTOS;
  const [i, setI] = useState(() => Math.floor(Math.random() * pool.length));
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % pool.length), DRIFT_MS);
    return () => clearInterval(id);
  }, [pool.length]);
  return (
    <View style={[styles.fill, styles.clip, { height: H * heightRatio }]} pointerEvents="none">
      <DriftFrame key={i} uri={pool[i % pool.length]} />
      <LinearGradient
        colors={['rgba(255,107,53,0.3)', 'rgba(255,107,53,0.38)', 'rgba(242,242,247,0.9)', BG]}
        locations={[0, 0.45, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0 },
  clip: { overflow: 'hidden' },
  blob: { position: 'absolute' },
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
