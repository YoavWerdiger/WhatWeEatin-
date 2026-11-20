import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const EASE = Easing.bezier(0.77, 0, 0.175, 1);

/** A tiny deck whose top card keeps getting swiped — shows how Swipe plays. */
export function SwipePreview() {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const move = (to: number) => withTiming(to, { duration: 420, easing: EASE });
    x.set(withRepeat(withSequence(move(22), withTiming(22, { duration: 500 }), move(0), move(-22), withTiming(-22, { duration: 500 }), move(0), withTiming(0, { duration: 600 })), -1));
    return () => cancelAnimation(x);
  }, [reduceMotion]);

  const top = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { rotate: `${x.get() * 0.4}deg` }],
  }));

  return (
    <View style={styles.stage}>
      <View style={[styles.card, styles.card3]} />
      <View style={[styles.card, styles.card2]} />
      <Animated.View style={[styles.card, styles.card1, top]}>
        <View style={styles.cardShade} />
      </Animated.View>
    </View>
  );
}

const SEGMENTS = ['#FF6B35', '#FFB020', '#22A35A', '#1D6FB8', '#9B59B6', '#E5484D'];
const WHEEL = 92;
const WC = WHEEL / 2;

function segmentPath(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const r = WC - 2;
  return `M ${WC} ${WC} L ${WC + r * Math.cos(a0)} ${WC + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${WC + r * Math.cos(a1)} ${WC + r * Math.sin(a1)} Z`;
}

/** A small wheel that keeps spinning — shows how Hunger roulette plays. */
export function RoulettePreview() {
  const reduceMotion = useReducedMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.set(withRepeat(withTiming(360, { duration: 3200, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(spin);
  }, [reduceMotion]);

  const wheel = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.wheel, wheel]}>
        <Svg width={WHEEL} height={WHEEL}>
          {SEGMENTS.map((c, i) => (
            <Path key={c} d={segmentPath(i, SEGMENTS.length)} fill={c} />
          ))}
          <Circle cx={WC} cy={WC} r={12} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
      {/* pointer */}
      <View style={styles.pointer} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 110, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    width: 62,
    height: 84,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  card3: { backgroundColor: '#E8D5C4', transform: [{ translateY: 8 }, { scale: 0.88 }] },
  card2: { backgroundColor: '#F2B48C', transform: [{ translateY: 4 }, { scale: 0.94 }] },
  card1: { backgroundColor: colors.primary },
  cardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28, backgroundColor: 'rgba(0,0,0,0.18)' },
  wheel: { width: WHEEL, height: WHEEL },
  pointer: {
    position: 'absolute',
    top: (110 - WHEEL) / 2 - 6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.text,
  },
});
