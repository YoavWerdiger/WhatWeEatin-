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

const { width: W, height: H } = Dimensions.get('window');
const COLS = 5;
const GAP = 10;
// Tilted and oversized so the rotated grid still covers the corners
const TILT = '-8deg';
const OVERSIZE = 1.6;
const TILE_W = (W * OVERSIZE - GAP * (COLS - 1)) / COLS;
// Varied heights so the columns don't line up into a plain table
const HEIGHTS = [1.35, 1.05, 1.5, 1.2, 1.4, 1.1];
/** Seconds for one full loop — slow, ambient, never something to watch */
const LOOP_S = [46, 38, 52, 42, 49];

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
  const goesUp = index % 2 === 0; // neighbouring columns run opposite ways

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

/**
 * Home backdrop: a tilted grid of food photos drifting in columns across the top of the screen,
 * under an orange wash that fades out into the app's normal background just above the title.
 */
export function HomeMosaic() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      <View style={styles.mosaicArea}>
        <View style={styles.grid}>
          {Array.from({ length: COLS }, (_, i) => (
            <Column key={i} index={i} />
          ))}
        </View>
        {/* Orange wash over the photos, then a fade into the page background (the text sits there) */}
        <LinearGradient
          colors={['rgba(255,107,53,0.35)', 'rgba(255,107,53,0.6)', 'rgba(242,242,247,0.85)', colors.background]}
          locations={[0, 0.5, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // The page background — the mosaic fades into it
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  mosaicArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Reaches down to the buttons; the title sits in the fade
    height: H * 0.74,
    overflow: 'hidden',
    // Orange between the photos
    backgroundColor: colors.primary,
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
