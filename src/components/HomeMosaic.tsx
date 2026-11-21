import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MOCK_RESTAURANTS } from '../utils/mockData';
import { colors } from '../theme/colors';

const { width: W } = Dimensions.get('window');
const COLS = 3;
const GAP = 10;
// Tilted and oversized so the rotated grid still covers the corners
const TILT = '-8deg';
const OVERSIZE = 1.35;
const TILE_W = (W * OVERSIZE - GAP * (COLS - 1)) / COLS;
// Varied heights so the columns don't line up into a plain table
const HEIGHTS = [1.35, 1.05, 1.5, 1.2, 1.4, 1.1];
/** Seconds for one full loop — slow, ambient, never something to watch */
const LOOP_S = [46, 38, 52];

// Small thumbnails: the grid is a backdrop, not a gallery
const PHOTOS = MOCK_RESTAURANTS.map((r) => r.image.replace(/w=\d+/, 'w=400'));

function Column({ index }: { index: number }) {
  const reduceMotion = useReducedMotion();
  const tiles = useMemo(() => {
    const out: { uri: string; h: number }[] = [];
    for (let i = 0; i < HEIGHTS.length; i++) {
      out.push({
        uri: PHOTOS[(i * COLS + index * 2) % PHOTOS.length],
        h: TILE_W * HEIGHTS[(i + index * 2) % HEIGHTS.length],
      });
    }
    return out;
  }, [index]);
  // One copy's height — the column holds two copies and slides by exactly one for a seamless loop
  const loopH = tiles.reduce((sum, t) => sum + t.h + GAP, 0);
  const goesUp = index !== 1; // middle column runs the other way

  const y = useSharedValue(goesUp ? 0 : -loopH);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withRepeat(
      withTiming(goesUp ? -loopH : 0, { duration: LOOP_S[index] * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(y);
  }, [reduceMotion, goesUp, loopH, index, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[styles.column, style]}>
      {[...tiles, ...tiles].map((t, i) => (
        <View key={i} style={[styles.tile, { height: t.h }]}>
          <Image source={{ uri: t.uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        </View>
      ))}
    </Animated.View>
  );
}

/** Home backdrop: a tilted grid of food photos drifting in columns, under a warm orange wash. */
export function HomeMosaic() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      <View style={styles.grid}>
        {Array.from({ length: COLS }, (_, i) => (
          <Column key={i} index={i} />
        ))}
      </View>
      {/* Orange wash: lighter on top so the photos read, deep at the bottom where the buttons sit */}
      <LinearGradient
        colors={['rgba(255,107,53,0.45)', 'rgba(255,107,53,0.72)', 'rgba(194,65,12,0.96)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    top: -W * 0.3,
    left: -(W * (OVERSIZE - 1)) / 2,
    width: W * OVERSIZE,
    flexDirection: 'row',
    gap: GAP,
    transform: [{ rotate: TILT }],
  },
  column: {
    width: TILE_W,
    gap: GAP,
  },
  tile: {
    width: TILE_W,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
