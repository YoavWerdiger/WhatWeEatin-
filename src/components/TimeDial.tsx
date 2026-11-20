import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Glass } from './ui/Glass';

const SIZE = 272;
const C = SIZE / 2;
const STROKE = 10;
const R = C - 22; // arc radius
const KNOB = 36;
/** Share of the circle used by timed values; the rest is "unlimited". */
const TIMED = 0.88;
const SETTLE = { duration: 300, dampingRatio: 1 };

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Arc from 12 o'clock, clockwise, covering `p` (0..1) of the circle. */
function arcPath(p: number): string {
  'worklet';
  const clamped = Math.min(Math.max(p, 0.0001), 0.9999);
  const a = clamped * 2 * Math.PI;
  const x = C + R * Math.sin(a);
  const y = C - R * Math.cos(a);
  return `M ${C} ${C - R} A ${R} ${R} 0 ${clamped > 0.5 ? 1 : 0} 1 ${x} ${y}`;
}

/** Clockwise fraction (0..1) of a point around the centre, 0 at 12 o'clock. */
function fractionAt(x: number, y: number): number {
  'worklet';
  const a = Math.atan2(x - C, -(y - C));
  return (a < 0 ? a + 2 * Math.PI : a) / (2 * Math.PI);
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface TimeDialProps {
  /** Seconds; 0 = unlimited. */
  value: number;
  onChange: (seconds: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unlimitedLabel: string;
  accessibilityLabel?: string;
}

/**
 * A kitchen-timer dial: drag freely around it and the time winds up, with a
 * fine ratchet tick every 5 seconds. Past the last timed value it becomes "unlimited".
 */
export function TimeDial({
  value,
  onChange,
  min = 30,
  max = 300,
  step = 5,
  unlimitedLabel,
  accessibilityLabel,
}: TimeDialProps) {
  const toFraction = useCallback(
    (v: number) => (v === 0 ? 1 : ((v - min) / (max - min)) * TIMED),
    [min, max],
  );
  const progress = useSharedValue(toFraction(value));
  const dragging = useSharedValue(false);
  const last = useRef(value);
  // What the dial shows while dragging. Kept local so a tick re-renders only the
  // dial, not the screen around it — that delay is what made the haptic feel late.
  const [shown, setShown] = useState(value);

  // Follow outside changes, but never fight the finger.
  useEffect(() => {
    if (dragging.get()) return;
    last.current = value;
    setShown(value);
    progress.set(withSpring(toFraction(value), SETTLE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const toSeconds = (p: number) => {
    'worklet';
    if (p > TIMED + (1 - TIMED) / 2) return 0;
    const raw = min + (Math.min(p, TIMED) / TIMED) * (max - min);
    return Math.min(max, Math.max(min, Math.round(raw / step) * step));
  };

  // Haptic first, then the smallest possible UI update.
  const tick = useCallback((seconds: number) => {
    if (seconds === last.current) return;
    const crossesUnlimited = seconds === 0 || last.current === 0;
    last.current = seconds;
    // Ratchet: a crisp tick per step, a firmer one at the unlimited edge.
    if (crossesUnlimited) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else void Haptics.selectionAsync();
    setShown(seconds);
  }, []);

  // The screen hears about the value once, when the finger lifts.
  const release = useCallback((seconds: number) => onChange(seconds), [onChange]);

  const commit = useCallback(
    (seconds: number) => {
      tick(seconds);
      onChange(seconds);
    },
    [tick, onChange],
  );

  // Fires only when the stepped value changes — not every frame.
  useAnimatedReaction(
    () => toSeconds(progress.get()),
    (s, prev) => {
      if (prev !== null && s !== prev) scheduleOnRN(tick, s);
    },
  );

  const pan = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => {
      dragging.set(true);
      progress.set(fractionAt(e.x, e.y));
    })
    .onUpdate((e) => {
      const prev = progress.get();
      let p = fractionAt(e.x, e.y);
      // Free drag, but no wrapping through 12 o'clock — hold at the ends.
      if (prev > 0.75 && p < 0.25) p = 1;
      else if (prev < 0.25 && p > 0.75) p = 0;
      progress.set(p);
    })
    .onFinalize(() => {
      dragging.set(false);
      const s = toSeconds(progress.get());
      progress.set(withSpring(s === 0 ? 1 : ((s - min) / (max - min)) * TIMED, SETTLE));
      scheduleOnRN(release, s);
    });

  const arcProps = useAnimatedProps(() => ({ d: arcPath(progress.get()) }));
  const knobStyle = useAnimatedStyle(() => {
    const a = Math.min(progress.get(), 0.9999) * 2 * Math.PI;
    return {
      transform: [
        { translateX: C - KNOB / 2 + R * Math.sin(a) },
        { translateY: C - KNOB / 2 - R * Math.cos(a) },
      ],
    };
  });

  const isUnlimited = shown === 0;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.dial}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: isUnlimited ? unlimitedLabel : formatClock(shown) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (isUnlimited) {
            if (e.nativeEvent.actionName === 'decrement') commit(max);
            return;
          }
          if (e.nativeEvent.actionName === 'increment') commit(shown + step > max ? 0 : shown + step);
          if (e.nativeEvent.actionName === 'decrement') commit(Math.max(min, shown - step));
        }}
      >
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={C} cy={C} r={C - 2} fill={colors.surface} />
          {/* track */}
          <Circle cx={C} cy={C} r={R} stroke={colors.borderLight} strokeWidth={STROKE} fill="none" />
          {/* the time you've wound in */}
          <AnimatedPath
            animatedProps={arcProps}
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        {/* The number owns the exact centre; the caption hangs below it without pushing it up */}
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.value} allowFontScaling={false}>
            {isUnlimited ? '∞' : formatClock(shown)}
          </Text>
        </View>
        {isUnlimited && (
          <View style={styles.captionWrap} pointerEvents="none">
            <Text style={styles.caption}>{unlimitedLabel}</Text>
          </View>
        )}

        <Animated.View style={[styles.knob, knobStyle]} pointerEvents="none">
          <Glass radius={KNOB / 2} interactive tint="rgba(255, 255, 255, 0.75)" style={styles.knobGlass}>
            <View style={styles.knobDot} />
          </Glass>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  dial: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // Bold, tabular numerals — width doesn't jump while dragging
  value: {
    fontSize: 68,
    lineHeight: 76,
    textAlign: 'center',
    includeFontPadding: false,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: C + 34,
    alignItems: 'center',
  },
  caption: { ...typography.subheadline, color: colors.textSecondary },
  // A physical knob: tinted glass plus a soft shadow, so it reads on the white face.
  knob: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: KNOB,
    height: KNOB,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  knobGlass: { width: KNOB, height: KNOB, alignItems: 'center', justifyContent: 'center' },
  knobDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
