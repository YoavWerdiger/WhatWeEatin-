import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Restaurant } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const RING = 116;
/** Fingers must stay put this long before a finger is chosen */
const HOLD_MS = 2600;
const RING_COLORS = ['#FF6B35', '#22A35A', '#3B82F6', '#A855F7', '#EAB308', '#EC4899', '#14B8A6', '#F97316'];

type Touch = { id: number; x: number; y: number; pick: number };

interface Props {
  /** The players' picks — each finger is dealt the next one, in order of touching */
  picks: Restaurant[];
  title: string;
  holdLabel: string;
  onChosen: (restaurantId: string) => void;
}

function FingerRing({ touch, restaurant, color, dimmed }: { touch: Touch; restaurant: Restaurant; color: string; dimmed: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 520, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View
      entering={ZoomIn.duration(180)}
      exiting={FadeOut.duration(220)}
      pointerEvents="none"
      style={[styles.ringWrap, { left: touch.x - RING / 2, top: touch.y - RING / 2, opacity: dimmed ? 0.15 : 1 }]}
    >
      <Animated.View style={[styles.ring, { borderColor: color }, style]}>
        <Image source={{ uri: restaurant.image }} style={styles.ringPhoto} contentFit="cover" transition={0} />
      </Animated.View>
      <View style={[styles.ringLabel, { backgroundColor: color }]}>
        <Text style={styles.ringLabelText} numberOfLines={1}>
          {restaurant.name}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Everyone puts a finger on the screen; each finger gets one of the picked restaurants.
 * Once the fingers hold still, one is chosen at random and its restaurant fills the screen.
 */
export function FingerChooser({ picks, title, holdLabel, onChosen }: Props) {
  const [touches, setTouches] = useState<Touch[]>([]);
  const [holding, setHolding] = useState(false);
  const [chosen, setChosen] = useState<Touch | null>(null);
  const nextPick = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchesRef = useRef<Touch[]>([]);
  touchesRef.current = touches;
  const chosenRef = useRef(false);

  const reveal = useSharedValue(0);

  const choose = useCallback(() => {
    const live = touchesRef.current;
    if (chosenRef.current || live.length === 0) return;
    chosenRef.current = true;
    const winner = live[Math.floor(Math.random() * live.length)];
    setChosen(winner);
    setHolding(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reveal.value = withTiming(1, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    setTimeout(() => onChosen(picks[winner.pick % picks.length].id), 1500);
  }, [onChosen, picks, reveal]);

  // Any change in fingers restarts the hold; ≥2 fingers (or 1 if only one pick) arm it
  const restartHold = useCallback(
    (count: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const needed = Math.min(2, Math.max(1, picks.length));
      if (chosenRef.current || count < needed) {
        setHolding(false);
        return;
      }
      setHolding(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      timer.current = setTimeout(choose, HOLD_MS);
    },
    [choose, picks.length],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const gesture = Gesture.Manual()
    .runOnJS(true)
    .onTouchesDown((e) => {
      if (chosenRef.current) return;
      const added = e.changedTouches.map((t) => ({ id: t.id, x: t.x, y: t.y, pick: nextPick.current++ }));
      const next = [...touchesRef.current.filter((t) => !added.some((a) => a.id === t.id)), ...added];
      setTouches(next);
      restartHold(next.length);
    })
    .onTouchesMove((e) => {
      if (chosenRef.current) return;
      setTouches((prev) =>
        prev.map((t) => {
          const m = e.changedTouches.find((c) => c.id === t.id);
          return m ? { ...t, x: m.x, y: m.y } : t;
        }),
      );
    })
    .onTouchesUp((e) => {
      if (chosenRef.current) return;
      const next = touchesRef.current.filter((t) => !e.changedTouches.some((c) => c.id === t.id));
      setTouches(next);
      if (next.length === 0) nextPick.current = 0;
      restartHold(next.length);
    })
    .onTouchesCancelled((e) => {
      if (chosenRef.current) return;
      const next = touchesRef.current.filter((t) => !e.changedTouches.some((c) => c.id === t.id));
      setTouches(next);
      restartHold(next.length);
    });

  // The chosen finger's restaurant grows out of its ring to fill the screen
  const revealStyle = useAnimatedStyle(() => {
    const size = RING + (Math.hypot(W, H) * 2.2 - RING) * reveal.value;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      left: (chosen?.x ?? W / 2) - size / 2,
      top: (chosen?.y ?? H / 2) - size / 2,
    };
  });

  const chosenPick = chosen ? picks[chosen.pick % picks.length] : null;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.root}>
        {touches.length === 0 && !chosen ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.prompt} pointerEvents="none">
            <Text style={styles.promptText}>{title}</Text>
          </Animated.View>
        ) : null}
        {holding && !chosen ? (
          <Animated.Text entering={FadeIn.duration(200)} style={styles.holdText} pointerEvents="none">
            {holdLabel}
          </Animated.Text>
        ) : null}

        {touches.map((t) => {
          const r = picks[t.pick % picks.length];
          return (
            <FingerRing
              key={t.id}
              touch={t}
              restaurant={r}
              color={RING_COLORS[(t.pick % picks.length) % RING_COLORS.length]}
              dimmed={!!chosen && chosen.id !== t.id}
            />
          );
        })}

        {chosen && chosenPick ? (
          <Animated.View style={[styles.reveal, revealStyle]} pointerEvents="none">
            <Image source={{ uri: chosenPick.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111114' },
  prompt: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  promptText: { ...typography.title1, color: '#FFFFFF', textAlign: 'center' },
  holdText: { position: 'absolute', top: 90, alignSelf: 'center', ...typography.headline, color: 'rgba(255,255,255,0.85)' },
  ringWrap: { position: 'absolute', width: RING, alignItems: 'center' },
  ring: { width: RING, height: RING, borderRadius: RING / 2, borderWidth: 5, overflow: 'hidden', backgroundColor: colors.primaryMuted },
  ringPhoto: { width: '100%', height: '100%' },
  ringLabel: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: 170 },
  ringLabelText: { ...typography.captionMedium, color: '#FFFFFF', fontWeight: '700' },
  reveal: { position: 'absolute', overflow: 'hidden' },
});
