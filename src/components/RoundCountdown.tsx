import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  Keyframe,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { typography } from '../theme/typography';
import { colors } from '../theme/colors';

const STEPS = ['3', '2', '1', 'go'] as const;
const STEP_MS = 520;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Each number lands: arrives a touch large and settles — a beat you can feel.
const land = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.35 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(260);

const leave = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.9 }], easing: EASE_OUT },
}).duration(160);

interface RoundCountdownProps {
  goLabel: string;
  onDone: () => void;
}

/** 3 · 2 · 1 · Go before a round — one haptic per beat, landing with the number. */
export function RoundCountdown({ goLabel, onDone }: RoundCountdownProps) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const isGo = STEPS[step] === 'go';
    if (isGo) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const id = setTimeout(() => {
      if (step < STEPS.length - 1) setStep(step + 1);
      else onDone();
    }, isGo ? 420 : STEP_MS);
    return () => clearTimeout(id);
  }, [step, onDone]);

  const value = STEPS[step];

  return (
    <Animated.View style={styles.scrim} exiting={FadeOut.duration(200)} pointerEvents="auto">
      <Animated.View
        key={value}
        entering={reduceMotion ? undefined : land}
        exiting={reduceMotion ? undefined : leave}
        style={styles.center}
      >
        <Text
          style={[styles.number, value === 'go' && styles.go]}
          accessibilityLiveRegion="assertive"
        >
          {value === 'go' ? goLabel : value}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28,28,30,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    ...typography.largeTitle,
    fontFamily: typography.code.fontFamily,
    fontSize: 120,
    lineHeight: 132,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  go: {
    fontFamily: undefined,
    fontSize: 72,
    lineHeight: 84,
    color: colors.primary,
  },
});
