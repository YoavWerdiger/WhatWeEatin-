import React, { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SwipeCard, CARD_WIDTH, CARD_HEIGHT } from './SwipeCard';
import { Restaurant, VoteType } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../i18n/t';
import { borderRadius } from '../theme/spacing';
import { SESSION, ANIMATION } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SWIPE_THRESHOLD = SESSION.SWIPE_THRESHOLD;
const SWIPE_VELOCITY = SESSION.SWIPE_VELOCITY_THRESHOLD;
const ROTATION_ANGLE = SESSION.MAX_CARD_ROTATION;
const SNAP_SPRING = ANIMATION.CARD_SNAP_BACK;
const EXIT_DURATION = 260;
const PROGRAMMATIC_DURATION = 420;

/** Soft drag envelope — card never leaves a controlled orbit. */
const MAX_DRAG_X = Math.min(SCREEN_WIDTH * 0.34, 140);
const MAX_DRAG_Y_DOWN = 48;
const MAX_DRAG_Y_UP = 56;
/** Rubber-band coefficient past the soft limit (0 = hard stop, 1 = free). */
const RUBBER = 0.28;

const STACK_CARDS = SESSION.CARD_STACK_SIZE;
const STACK_SCALE_STEP = 0.045;
const STACK_OFFSET_STEP = 10;

const EXIT_EASING = Easing.bezier(0.22, 1, 0.36, 1);

export interface CardStackRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface CardStackProps {
  restaurants: Restaurant[];
  currentIndex: number;
  onSwipe: (restaurant: Restaurant, direction: VoteType) => void;
}

/** Progressive resistance so yanking past the soft max feels sticky, not free. */
function resist(offset: number, limit: number): number {
  'worklet';
  const sign = offset < 0 ? -1 : 1;
  const abs = Math.abs(offset);
  if (abs <= limit) return offset;
  const overshoot = abs - limit;
  return sign * (limit + (overshoot * RUBBER * limit) / (limit + overshoot));
}

function clampExitY(y: number): number {
  'worklet';
  const maxArc = 56;
  return Math.max(-maxArc, Math.min(maxArc, y * 0.22));
}

export const CardStack = forwardRef<CardStackRef, CardStackProps>(
  ({ restaurants, currentIndex, onSwipe }, ref) => {
    const { t } = useTranslation();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isLocked = useSharedValue(false);

    useEffect(() => {
      translateX.value = 0;
      translateY.value = 0;
      isLocked.value = false;
    }, [currentIndex]);

    const triggerHaptic = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const emitSwipe = useCallback(
      (direction: VoteType) => {
        const restaurant = restaurants[currentIndex];
        if (restaurant) {
          onSwipe(restaurant, direction);
        }
      },
      [restaurants, currentIndex, onSwipe],
    );

    const animateExit = useCallback(
      (direction: 'like' | 'dislike') => {
        'worklet';
        isLocked.value = true;

        const dest =
          direction === 'like'
            ? { x: SCREEN_WIDTH * 1.25, y: clampExitY(translateY.value) }
            : { x: -SCREEN_WIDTH * 1.25, y: clampExitY(translateY.value) };

        translateX.value = withTiming(dest.x, {
          duration: EXIT_DURATION,
          easing: EXIT_EASING,
        });
        translateY.value = withTiming(
          dest.y,
          {
            duration: EXIT_DURATION,
            easing: EXIT_EASING,
          },
          (finished) => {
            if (finished) {
              runOnJS(emitSwipe)(direction);
            }
          },
        );
        runOnJS(triggerHaptic)();
      },
      [emitSwipe, triggerHaptic],
    );

    const programmaticSwipe = useCallback(
      (direction: 'like' | 'dislike') => {
        if (isLocked.value) return;
        isLocked.value = true;

        const dest =
          direction === 'like'
            ? { x: SCREEN_WIDTH * 1.25, y: -36 }
            : { x: -SCREEN_WIDTH * 1.25, y: -36 };

        translateX.value = withTiming(dest.x, {
          duration: PROGRAMMATIC_DURATION,
          easing: EXIT_EASING,
        });
        translateY.value = withTiming(
          dest.y,
          {
            duration: PROGRAMMATIC_DURATION,
            easing: EXIT_EASING,
          },
          (finished) => {
            if (finished) {
              runOnJS(triggerHaptic)();
              runOnJS(emitSwipe)(direction);
            }
          },
        );
      },
      [emitSwipe, triggerHaptic],
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => programmaticSwipe('dislike'),
      swipeRight: () => programmaticSwipe('like'),
    }));

    const panGesture = Gesture.Pan()
      .activeOffsetX([-12, 12])
      .activeOffsetY([-18, 18])
      .onUpdate((e) => {
        if (isLocked.value) return;
        translateX.value = resist(e.translationX, MAX_DRAG_X);
        if (e.translationY >= 0) {
          translateY.value = Math.min(e.translationY, MAX_DRAG_Y_DOWN);
        } else {
          translateY.value = resist(e.translationY, MAX_DRAG_Y_UP);
        }
      })
      .onEnd((e) => {
        if (isLocked.value) return;

        const x = translateX.value;
        const y = translateY.value;
        const absX = Math.abs(x);
        const absY = Math.abs(y);

        const horizontalDominant = absX >= absY * 0.75;
        const flingRight = e.velocityX > SWIPE_VELOCITY && horizontalDominant;
        const flingLeft = e.velocityX < -SWIPE_VELOCITY && horizontalDominant;

        if (horizontalDominant && (x > SWIPE_THRESHOLD || flingRight)) {
          animateExit('like');
        } else if (horizontalDominant && (x < -SWIPE_THRESHOLD || flingLeft)) {
          animateExit('dislike');
        } else {
          translateX.value = withSpring(0, SNAP_SPRING);
          translateY.value = withSpring(0, SNAP_SPRING);
        }
      });

    const topCardStyle = useAnimatedStyle(() => {
      const rotation = interpolate(
        translateX.value,
        [-MAX_DRAG_X, 0, MAX_DRAG_X],
        [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
        Extrapolation.CLAMP,
      );

      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${rotation}deg` },
        ],
      };
    });

    const likeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD * 0.55],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }));

    const nopeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD * 0.55, 0],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    }));

    const visibleCards = restaurants.slice(currentIndex, currentIndex + STACK_CARDS);

    if (visibleCards.length === 0) return null;

    return (
      <View style={styles.container}>
        {visibleCards
          .map((restaurant, stackIndex) => {
            if (stackIndex === 0) {
              return (
                <GestureDetector key={`card-${currentIndex}`} gesture={panGesture}>
                  <Animated.View style={[styles.topCardWrapper, topCardStyle]}>
                    <SwipeCard restaurant={restaurant} />

                    <Animated.View
                      style={[styles.overlayStamp, styles.likeStamp, likeOpacity]}
                      pointerEvents="none"
                    >
                      <Text style={styles.likeStampText}>{t('swipeActions.like')}</Text>
                    </Animated.View>

                    <Animated.View
                      style={[styles.overlayStamp, styles.nopeStamp, nopeOpacity]}
                      pointerEvents="none"
                    >
                      <Text style={styles.nopeStampText}>{t('swipeActions.pass')}</Text>
                    </Animated.View>
                  </Animated.View>
                </GestureDetector>
              );
            }

            return (
              <StackCard
                key={restaurant.id}
                restaurant={restaurant}
                stackIndex={stackIndex}
                translateX={translateX}
                translateY={translateY}
              />
            );
          })
          .reverse()}
      </View>
    );
  },
);

interface StackCardProps {
  restaurant: Restaurant;
  stackIndex: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}

function StackCard({
  restaurant,
  stackIndex,
  translateX,
  translateY,
}: StackCardProps) {
  const style = useAnimatedStyle(() => {
    const dragDistance = Math.sqrt(
      translateX.value * translateX.value + translateY.value * translateY.value,
    );
    const progress = interpolate(
      dragDistance,
      [0, SWIPE_THRESHOLD * 1.8],
      [0, 1],
      Extrapolation.CLAMP,
    );

    const baseScale = 1 - stackIndex * STACK_SCALE_STEP;
    const targetScale = 1 - (stackIndex - 1) * STACK_SCALE_STEP;
    const scale = baseScale + (targetScale - baseScale) * progress;

    const baseY = stackIndex * STACK_OFFSET_STEP;
    const targetY = (stackIndex - 1) * STACK_OFFSET_STEP;
    const offsetY = baseY + (targetY - baseY) * progress;

    return {
      transform: [{ scale }, { translateY: offsetY }],
      zIndex: -stackIndex,
    };
  });

  return (
    <Animated.View style={[styles.stackCardWrapper, style]}>
      <SwipeCard restaurant={restaurant} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCardWrapper: {
    position: 'absolute',
    zIndex: 100,
  },
  stackCardWrapper: {
    position: 'absolute',
  },

  overlayStamp: {
    position: 'absolute',
    top: 40,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 4,
    borderRadius: borderRadius.md,
  },
  likeStamp: {
    left: 20,
    borderColor: colors.accent,
    transform: [{ rotate: '-18deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: colors.danger,
    transform: [{ rotate: '18deg' }],
  },
  likeStampText: {
    ...typography.largeTitle,
    color: colors.accent,
  },
  nopeStampText: {
    ...typography.largeTitle,
    color: colors.danger,
  },
});
