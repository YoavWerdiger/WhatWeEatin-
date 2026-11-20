import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Keyframe,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MOCK_RESTAURANTS } from '../utils/mockData';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Glass } from './ui/Glass';

const CARD_W = 168;
const CARD_H = 224;
const EASE = Easing.bezier(0.77, 0, 0.175, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Back two cards fan out; the front one stays upright and does the swiping.
const FAN = [
  { rotate: -12, x: -64, y: 14 },
  { rotate: 10, x: 64, y: 10 },
  { rotate: 0, x: 0, y: 0 },
];

const deal = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 60 }, { rotate: '0deg' }, { scale: 0.9 }] },
    100: {
      opacity: 1,
      transform: [{ translateY: FAN[i].y }, { rotate: `${FAN[i].rotate}deg` }, { scale: 1 }],
      easing: EASE_OUT,
    },
  })
    .duration(460)
    .delay(120 + i * 110);

/** The home screen shows the game: a dealt hand of restaurants, the top one getting liked. */
export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const swipe = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // Every few seconds the front card leans right and gets a ♥, then settles back.
    swipe.set(
      withDelay(
        1100,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 520, easing: EASE }),
            withTiming(1, { duration: 700 }),
            withTiming(0, { duration: 480, easing: EASE }),
            withTiming(0, { duration: 1800 }),
          ),
          -1,
        ),
      ),
    );
    return () => cancelAnimation(swipe);
  }, [reduceMotion]);

  const front = useAnimatedStyle(() => ({
    transform: [
      { translateX: swipe.get() * 46 },
      { rotate: `${swipe.get() * 9}deg` },
    ],
  }));
  const stamp = useAnimatedStyle(() => ({
    opacity: swipe.get(),
    transform: [{ rotate: '-10deg' }, { scale: withSpring(0.85 + swipe.get() * 0.15, { duration: 250 }) }],
  }));

  const cards = MOCK_RESTAURANTS.slice(0, 3);

  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {cards.map((r, i) => {
        const isFront = i === 2;
        return (
          <Animated.View
            key={r.id}
            entering={reduceMotion ? undefined : deal(i)}
            style={[
              styles.slot,
              { transform: [{ translateX: FAN[i].x }, { translateY: FAN[i].y }, { rotate: `${FAN[i].rotate}deg` }] },
            ]}
          >
            <Animated.View style={[styles.card, isFront && front]}>
              <Image source={{ uri: r.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.shade} />
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              {isFront && (
                <Animated.View style={[styles.stamp, stamp]}>
                  <Glass radius={999} scheme="dark" tint="rgba(34, 163, 90, 0.8)" style={styles.stampGlass}>
                    <Ionicons name="heart" size={26} color="#FFFFFF" />
                  </Glass>
                </Animated.View>
              )}
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: CARD_H + 56, alignItems: 'center', justifyContent: 'center' },
  slot: { position: 'absolute' },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, backgroundColor: 'rgba(0,0,0,0.35)' },
  name: { ...typography.subheadline, fontWeight: '600', color: '#FFFFFF', position: 'absolute', left: 12, right: 12, bottom: 12 },
  stamp: { position: 'absolute', top: 14, left: 14 },
  stampGlass: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
});
