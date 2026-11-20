import React, { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useReducedMotion,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { SwipeCard, CARD_WIDTH, CARD_HEIGHT } from './SwipeCard';
import { Glass } from './ui/Glass';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant, VoteType } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../i18n/t';
import { borderRadius } from '../theme/spacing';
import { SESSION } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SWIPE_THRESHOLD = SESSION.SWIPE_THRESHOLD;
const SWIPE_VELOCITY = SESSION.SWIPE_VELOCITY_THRESHOLD;
/** Tilt at one screen-width of travel. Grabbing the bottom half tilts the other way. */
const ROTATION_PER_WIDTH = 16;
const OFFSCREEN_X = SCREEN_WIDTH * 1.4;

// Finger was on the card → springs, so release velocity carries through.
const SNAP_BACK = { duration: 400, dampingRatio: 0.8 };
const THROW = { duration: 350, dampingRatio: 1, overshootClamping: true };
const BUTTON_SWIPE_DURATION = 320;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const STACK_CARDS = SESSION.CARD_STACK_SIZE;
const STACK_SCALE_STEP = 0.045;
const STACK_OFFSET_STEP = 10;

export interface CardStackRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface CardStackProps {
  restaurants: Restaurant[];
  currentIndex: number;
  onSwipe: (restaurant: Restaurant, direction: VoteType) => void;
}

/** Apple's momentum projection — where a flick would come to rest. */
function project(velocity: number): number {
  'worklet';
  const decel = 0.998;
  return ((velocity / 1000) * decel) / (1 - decel);
}

export const CardStack = forwardRef<CardStackRef, CardStackProps>(
  ({ restaurants, currentIndex, onSwipe }, ref) => {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const tiltSign = useSharedValue(1);
    const isLocked = useSharedValue(false);
    /** Which card (absolute index) the drag offsets belong to. */
    const owner = useSharedValue(currentIndex);
    /** A thrown card, hidden the moment its throw lands. */
    const gone = useSharedValue(-1);

    // The next card arrives already centred: offsets only move their owner, and
    // ownership moves on here, after the new top card has rendered.
    useEffect(() => {
      translateX.set(0);
      translateY.set(0);
      owner.set(currentIndex);
      isLocked.set(false);
    }, [currentIndex]);

    // Warm the next few photos so a promoted card never shows an empty frame.
    useEffect(() => {
      restaurants.slice(currentIndex + 1, currentIndex + 4).forEach((r) => {
        if (r.image) void Image.prefetch(r.image);
      });
    }, [currentIndex, restaurants]);

    const tick = useCallback(() => {
      void Haptics.selectionAsync();
    }, []);

    const commitHaptic = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const emitSwipe = useCallback(
      (direction: VoteType) => {
        const restaurant = restaurants[currentIndex];
        if (restaurant) onSwipe(restaurant, direction);
      },
      [restaurants, currentIndex, onSwipe],
    );

    // A tick the moment the card crosses into "like" / "pass" (and back out),
    // so the decision is felt before the finger lifts.
    useAnimatedReaction(
      () => {
        const x = translateX.get();
        return x > SWIPE_THRESHOLD ? 1 : x < -SWIPE_THRESHOLD ? -1 : 0;
      },
      (zone, prev) => {
        if (prev !== null && zone !== prev && !isLocked.get()) {
          scheduleOnRN(tick);
        }
      },
    );

    const throwCard = (direction: 'like' | 'dislike', velocityX: number, velocityY: number) => {
      'worklet';
      isLocked.set(true);
      const sign = direction === 'like' ? 1 : -1;
      // Keep the flick's speed; never let a slow release crawl off screen.
      const vx = sign * Math.max(Math.abs(velocityX), 1400);
      translateX.set(
        withSpring(sign * OFFSCREEN_X, { ...THROW, velocity: vx }, (finished) => {
          if (!finished) return;
          gone.set(owner.get());
          scheduleOnRN(emitSwipe, direction);
        }),
      );
      translateY.set(withSpring(translateY.get() + velocityY * 0.12, { ...THROW, velocity: velocityY }));
      scheduleOnRN(commitHaptic);
    };

    const programmaticSwipe = useCallback(
      (direction: 'like' | 'dislike') => {
        if (isLocked.get()) return;
        isLocked.set(true);
        const sign = direction === 'like' ? 1 : -1;
        tiltSign.set(1);
        commitHaptic();
        translateY.set(withTiming(-24, { duration: BUTTON_SWIPE_DURATION, easing: EASE_OUT }));
        translateX.set(
          withTiming(sign * OFFSCREEN_X, { duration: BUTTON_SWIPE_DURATION, easing: EASE_OUT }, (finished) => {
            if (!finished) return;
            gone.set(owner.get());
            scheduleOnRN(emitSwipe, direction);
          }),
        );
      },
      [emitSwipe, commitHaptic],
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => programmaticSwipe('dislike'),
      swipeRight: () => programmaticSwipe('like'),
    }));

    const panGesture = Gesture.Pan()
      .maxPointers(1)
      .activeOffsetX([-10, 10])
      .failOffsetY([-24, 24])
      .onBegin((e) => {
        // Where the card was grabbed decides which way it pivots — like a real card.
        tiltSign.set(e.y > CARD_HEIGHT / 2 ? -1 : 1);
      })
      .onUpdate((e) => {
        if (isLocked.get()) return;
        // 1:1 — the card stays under the finger.
        translateX.set(e.translationX);
        translateY.set(e.translationY);
      })
      .onEnd((e) => {
        if (isLocked.get()) return;
        // Decide from where the flick is heading, not only where it was released.
        const landing = translateX.get() + project(e.velocityX);
        const fast = Math.abs(e.velocityX) > SWIPE_VELOCITY;
        if (landing > SWIPE_THRESHOLD * 1.5 && (translateX.get() > SWIPE_THRESHOLD || fast)) {
          throwCard('like', e.velocityX, e.velocityY);
        } else if (landing < -SWIPE_THRESHOLD * 1.5 && (translateX.get() < -SWIPE_THRESHOLD || fast)) {
          throwCard('dislike', e.velocityX, e.velocityY);
        } else {
          translateX.set(withSpring(0, { ...SNAP_BACK, velocity: e.velocityX }));
          translateY.set(withSpring(0, { ...SNAP_BACK, velocity: e.velocityY }));
        }
      });

    const visibleCards = restaurants.slice(currentIndex, currentIndex + STACK_CARDS);

    if (visibleCards.length === 0) return null;

    const shared = { translateX, translateY, tiltSign, owner, gone, reduceMotion };
    return (
      <View style={styles.container}>
        {visibleCards
          .map((restaurant, stackIndex) => (
            // Stable key: a card keeps its photo and glass views when it moves up the deck.
            <DeckCard
              key={restaurant.id}
              restaurant={restaurant}
              absIndex={currentIndex + stackIndex}
              stackIndex={stackIndex}
              gesture={stackIndex === 0 ? panGesture : idleGesture}
              likeLabel={t('swipeActions.like')}
              passLabel={t('swipeActions.pass')}
              {...shared}
            />
          ))
          .reverse()}
      </View>
    );
  },
);

const idleGesture = Gesture.Pan().enabled(false);

interface DeckCardProps {
  restaurant: Restaurant;
  absIndex: number;
  stackIndex: number;
  gesture: ReturnType<typeof Gesture.Pan>;
  likeLabel: string;
  passLabel: string;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  tiltSign: SharedValue<number>;
  owner: SharedValue<number>;
  gone: SharedValue<number>;
  reduceMotion: boolean;
}

function DeckCard({
  restaurant,
  absIndex,
  stackIndex,
  gesture,
  likeLabel,
  passLabel,
  translateX,
  translateY,
  tiltSign,
  owner,
  gone,
  reduceMotion,
}: DeckCardProps) {
  const style = useAnimatedStyle(() => {
    const topIndex = absIndex - stackIndex;
    const ownsOffsets = owner.get() === topIndex;
    const x = ownsOffsets ? translateX.get() : 0;
    const y = ownsOffsets ? translateY.get() : 0;

    if (stackIndex === 0) {
      const rotation = reduceMotion ? 0 : (x / SCREEN_WIDTH) * ROTATION_PER_WIDTH * tiltSign.get();
      return {
        opacity: gone.get() === absIndex ? 0 : 1,
        zIndex: 100,
        transform: [{ translateX: x }, { translateY: y }, { rotate: `${rotation}deg` }, { scale: 1 }],
      };
    }

    // The card underneath rises to meet you as the top one leaves.
    const progress = interpolate(Math.sqrt(x * x + y * y), [0, SWIPE_THRESHOLD * 1.8], [0, 1], Extrapolation.CLAMP);
    const baseScale = 1 - stackIndex * STACK_SCALE_STEP;
    const targetScale = 1 - (stackIndex - 1) * STACK_SCALE_STEP;
    const baseY = stackIndex * STACK_OFFSET_STEP;
    const targetY = (stackIndex - 1) * STACK_OFFSET_STEP;
    return {
      opacity: 1,
      zIndex: -stackIndex,
      transform: [
        { translateX: 0 },
        { translateY: baseY + (targetY - baseY) * progress },
        { rotate: '0deg' },
        { scale: baseScale + (targetScale - baseScale) * progress },
      ],
    };
  });

  // Stamps grow into place as the top card nears the threshold.
  const likeStyle = useAnimatedStyle(() => {
    const x = stackIndex === 0 && owner.get() === absIndex ? translateX.get() : 0;
    const p = interpolate(x, [SWIPE_THRESHOLD * 0.25, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ rotate: '-8deg' }, { scale: 0.9 + 0.1 * p }] };
  });
  const nopeStyle = useAnimatedStyle(() => {
    const x = stackIndex === 0 && owner.get() === absIndex ? translateX.get() : 0;
    const p = interpolate(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.25], [1, 0], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ rotate: '8deg' }, { scale: 0.9 + 0.1 * p }] };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.cardWrapper, style]}>
        <SwipeCard restaurant={restaurant} />
        <Animated.View style={[styles.overlayStamp, styles.likeStamp, likeStyle]} pointerEvents="none">
          <Glass radius={999} scheme="dark" tint="rgba(34, 163, 90, 0.75)" style={styles.stampGlass}>
            <Ionicons name="heart" size={22} color="#FFFFFF" />
            <Text style={styles.stampText}>{likeLabel}</Text>
          </Glass>
        </Animated.View>
        <Animated.View style={[styles.overlayStamp, styles.nopeStamp, nopeStyle]} pointerEvents="none">
          <Glass radius={999} scheme="dark" tint="rgba(217, 45, 32, 0.75)" style={styles.stampGlass}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
            <Text style={styles.stampText}>{passLabel}</Text>
          </Glass>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
  },

  overlayStamp: {
    position: 'absolute',
    top: 28,
    zIndex: 50,
  },
  likeStamp: { left: 20 },
  nopeStamp: { right: 20 },
  stampGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stampText: {
    ...typography.title3,
    color: '#FFFFFF',
  },
});
