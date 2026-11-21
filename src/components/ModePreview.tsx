import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  SharedValue,
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

const FINGER_COLORS = [colors.primary, '#22A35A', '#3B82F6'];

/** Three finger rings on a dark pad; the pick hops between them and settles — how Finger pick plays. */
export function FingerPreview() {
  const reduceMotion = useReducedMotion();
  const [lit, setLit] = React.useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setLit((i) => (i + 1) % FINGER_COLORS.length), 700);
    return () => clearInterval(id);
  }, [reduceMotion]);
  return (
    <View style={[styles.stage, styles.fingerPad]}>
      {FINGER_COLORS.map((c, i) => (
        <View
          key={c}
          style={[
            styles.fingerRing,
            { borderColor: c, left: 18 + i * 34, top: i === 1 ? 18 : 40, opacity: lit === i ? 1 : 0.35 },
            lit === i && { transform: [{ scale: 1.15 }] },
          ]}
        >
          <Ionicons name="finger-print" size={18} color={c} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fingerPad: { backgroundColor: '#1C1C1E', borderRadius: 14 },
  fingerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
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
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 6, direction: 'ltr' },
  mini: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  miniLetter: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  miniBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  miniBadgeStar: { backgroundColor: colors.primary },
  miniPlay: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
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

const MINI = [
  { letter: 'A', color: '#FF6B35' },
  { letter: 'B', color: '#22A35A' },
  { letter: 'C', color: '#1D6FB8' },
];

function useLoop(length: number, duration: number) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(reduceMotion ? length : 0);
  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(length, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [reduceMotion]);
  return t;
}

/** Everyone ticks ready, one by one — only then does play light up. */
export function ReadyPreview() {
  const t = useLoop(5, 3600);
  return (
    <View style={styles.stage}>
      <View style={styles.miniRow}>
        {MINI.map((p, i) => (
          <MiniPlayer key={p.letter} {...p} t={t} showAt={i + 0.6} badge="check" />
        ))}
        <MiniPlay t={t} showAt={3.6} />
      </View>
    </View>
  );
}

/** The host hits play right away; the others drop in while it's running. */
export function HostStartPreview() {
  const t = useLoop(4, 3000);
  return (
    <View style={styles.stage}>
      <View style={styles.miniRow}>
        <MiniPlayer {...MINI[0]} t={t} showAt={0.3} badge="star" />
        <MiniPlayer {...MINI[1]} t={t} showAt={1.6} fadeIn />
        <MiniPlayer {...MINI[2]} t={t} showAt={2.2} fadeIn />
        <MiniPlay t={t} showAt={0.7} />
      </View>
    </View>
  );
}

function MiniPlayer({
  letter,
  color,
  t,
  showAt,
  badge,
  fadeIn,
}: {
  letter: string;
  color: string;
  t: SharedValue<number>;
  showAt: number;
  badge?: 'check' | 'star';
  fadeIn?: boolean;
}) {
  const body = useAnimatedStyle(() => {
    if (!fadeIn) return { opacity: 1 };
    const p = Math.min(1, Math.max(0, (t.get() - showAt) / 0.3));
    return { opacity: 0.25 + 0.75 * p, transform: [{ translateY: (1 - p) * -8 }] };
  });
  const mark = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.get() - showAt) / 0.25));
    return { opacity: p, transform: [{ scale: 0.5 + 0.5 * p }] };
  });
  return (
    <Animated.View style={[styles.mini, { backgroundColor: color }, body]}>
      <Text style={styles.miniLetter}>{letter}</Text>
      {badge && (
        <Animated.View style={[styles.miniBadge, badge === 'star' && styles.miniBadgeStar, mark]}>
          <Ionicons name={badge === 'star' ? 'star' : 'checkmark'} size={9} color="#FFFFFF" />
        </Animated.View>
      )}
    </Animated.View>
  );
}

function MiniPlay({ t, showAt }: { t: SharedValue<number>; showAt: number }) {
  const lit = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.get() - showAt) / 0.25));
    return {
      backgroundColor: p > 0.5 ? colors.primary : colors.borderLight,
      transform: [{ scale: 1 + 0.12 * Math.sin(p * Math.PI) }],
    };
  });
  const icon = useAnimatedStyle(() => ({ opacity: 0.5 + 0.5 * Math.min(1, Math.max(0, (t.get() - showAt) / 0.25)) }));
  return (
    <Animated.View style={[styles.miniPlay, lit]}>
      <Animated.View style={icon}>
        <Ionicons name="play" size={14} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
}

