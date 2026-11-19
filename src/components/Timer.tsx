import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { colors } from '../theme/colors';
import { typography, fontFamilies } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  /** Badge only — for embedding in a top bar */
  compact?: boolean;
}

export function Timer({ timeRemaining, totalTime, compact = false }: TimerProps) {
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const isUrgent = totalTime > 0 && timeRemaining <= 30;
  const isCritical = totalTime > 0 && timeRemaining <= 10;

  useEffect(() => {
    if (!isCritical) return;
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isCritical, pulseAnim]);

  if (totalTime <= 0) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = timeRemaining / totalTime;

  const barColor = isCritical
    ? colors.danger
    : isUrgent
    ? colors.warning
    : colors.primary;

  if (compact) {
    return (
      <RNAnimated.View
        style={[
          styles.compactBadge,
          { backgroundColor: barColor, transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.timerText}>{timeString}</Text>
      </RNAnimated.View>
    );
  }

  return (
    <RNAnimated.View
      style={[styles.container, { transform: [{ scale: pulseAnim }] }]}
    >
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBar,
            { width: `${progress * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={[styles.timerBadge, { backgroundColor: barColor }]}>
        <Text style={styles.timerText}>{timeString}</Text>
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  timerBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  compactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    minWidth: 52,
    alignItems: 'center',
  },
  timerText: {
    ...typography.subheadline,
    fontFamily: fontFamilies.mono,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: '#FFFFFF',
  },
});
