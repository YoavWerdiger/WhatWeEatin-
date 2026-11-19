import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { useTranslation } from '../i18n/t';

interface SwipeActionsProps {
  onDislike: () => void;
  onLike: () => void;
}

const SPRING = { damping: 15, stiffness: 320 };
const PILL_SIZE = 72;
const HIT = 8;

function ActionPill({
  onPress,
  icon,
  label,
  gradient,
  borderColor,
  accentColor,
}: {
  onPress: () => void;
  icon: ReactNode;
  label: string;
  gradient: readonly [string, string];
  borderColor: string;
  accentColor: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={HIT}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.pillOuter,
          {
            borderColor,
          },
          shadows.md,
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.pillGradient}
        >
          <View style={styles.iconWrap}>{icon}</View>
          <Text style={[styles.label, { color: accentColor }]}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export function SwipeActions({ onDislike, onLike }: SwipeActionsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ActionPill
        onPress={onDislike}
        icon={
          <Ionicons name="close" size={28} color={colors.danger} />
        }
        label={t('swipeActions.pass')}
        gradient={['rgba(255,71,87,0.12)', 'rgba(255,71,87,0.28)'] as const}
        borderColor="rgba(255,71,87,0.45)"
        accentColor={colors.danger}
      />
      <ActionPill
        onPress={onLike}
        icon={
          <Ionicons
            name="heart-outline"
            size={28}
            color={colors.accentDark}
          />
        }
        label={t('swipeActions.like')}
        gradient={['rgba(46,204,113,0.14)', 'rgba(46,204,113,0.32)'] as const}
        borderColor="rgba(46,204,113,0.5)"
        accentColor={colors.accentDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl + spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: PILL_SIZE + spacing.lg,
  },
  pressable: {
    minWidth: PILL_SIZE,
    minHeight: PILL_SIZE,
  },
  pillOuter: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pillGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  iconWrap: {
    marginBottom: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
