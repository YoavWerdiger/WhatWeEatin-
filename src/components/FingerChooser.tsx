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
const HOLD_MS = 2000;
/** The zigzag between fingers before the pick */
const HOP_LOOPS = 3;
const HOP_FAST_MS = 70;
const HOP_SLOW_MS = 460;
const LABEL_W = 220;
const HALO = 6;
const RING_COLORS = ['#FF6B35', '#22A35A', '#3B82F6', '#A855F7', '#EAB308', '#EC4899', '#14B8A6', '#F97316'];

type Touch = { id: number; x: number; y: number; pick: number };

interface Props {
  /** The players' picks — each finger is dealt the next one, in order of touching */
  picks: Restaurant[];
  title: string;
  holdLabel: string;
  onChosen: (restaurantId: string) => void;
}

function FingerRing({
  touch,
  restaurant,
  color,
  dimmed,
  hidden,
  lit,
  won,
}: {
  touch: Touch;
  restaurant: Restaurant;
  color: string;
  dimmed: boolean;
  hidden?: boolean;
  /** The zigzag is on this finger right now */
  lit?: boolean;
  /** Winner: sits on its own colour, so it gets a white halo and a white label */
  won?: boolean;
}) {
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
      style={[
        styles.ringWrap,
        {
          left: touch.x - LABEL_W / 2,
          top: touch.y - RING / 2 - HALO,
          opacity: hidden ? 0 : dimmed ? 0.35 : 1,
          transform: [{ scale: lit ? 1.25 : 1 }],
        },
      ]}
    >
      <Animated.View style={[styles.halo, won && styles.haloOn, style]}>
        <View style={[styles.ring, { borderColor: color }]}>
          <Image source={{ uri: restaurant.image }} style={styles.ringPhoto} contentFit="cover" transition={0} />
        </View>
      </Animated.View>
      <View style={[styles.ringLabel, { backgroundColor: won ? '#FFFFFF' : color }]}>
        <Text style={[styles.ringLabelText, won && { color }]} numberOfLines={2}>
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
  // The zigzag: a highlight hops finger to finger (with a tick each hop), slowing into the winner
  const [hopId, setHopId] = useState<number | null>(null);
  const hopTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => hopTimers.current.forEach(clearTimeout), []);

  const choose = useCallback(() => {
    const live = touchesRef.current;
    if (chosenRef.current || live.length === 0) return;
    chosenRef.current = true;
    setHolding(false);
    // Order by position (left→right) so the hop zigzags across the hands
    const order = [...live].sort((a, b) => a.x - b.x || a.y - b.y);
    const winnerIdx = Math.floor(Math.random() * order.length);
    const winner = order[winnerIdx];
    if (__DEV__) {
      console.log('[finger] draw', { fingers: order.map((o) => ({ id: o.id, pick: o.pick })), winnerIdx, winnerPick: winner.pick });
    }
    const total = (order.length > 1 ? HOP_LOOPS * order.length : 1) + winnerIdx + 1;
    let at = 0;
    for (let i = 0; i < total; i++) {
      const p = i / Math.max(1, total - 1);
      at += HOP_FAST_MS + (HOP_SLOW_MS - HOP_FAST_MS) * p * p * p; // fast, then slowing
      const t = order[i % order.length];
      const last = i === total - 1;
      hopTimers.current.push(
        setTimeout(() => {
          setHopId(t.id);
          if (!last) {
            void Haptics.selectionAsync();
            return;
          }
          setChosen(winner);
          setHopId(null);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          reveal.value = withTiming(1, { duration: 700, easing: Easing.bezier(0.22, 1, 0.36, 1) });
          // A beat on the full colour with the winning ring, then the match screen
          hopTimers.current.push(setTimeout(() => onChosen(picks[winner.pick % picks.length].id), 1700));
        }, at),
      );
    }
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
    // Just big enough to cover the screen from the finger — a flood, not a zoom
    const size = RING + (Math.hypot(W, H) * 2 - RING) * reveal.value;
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

        {/* The chosen ring's colour floods the screen from under the finger; the ring stays on top */}
        {chosen && chosenPick ? (
          <Animated.View
            style={[styles.reveal, { backgroundColor: RING_COLORS[(chosen.pick % picks.length) % RING_COLORS.length] }, revealStyle]}
            pointerEvents="none"
          />
        ) : null}

        {touches.map((t) => {
          const r = picks[t.pick % picks.length];
          return (
            <FingerRing
              key={t.id}
              touch={t}
              restaurant={r}
              color={RING_COLORS[(t.pick % picks.length) % RING_COLORS.length]}
              dimmed={(!!chosen && chosen.id !== t.id) || (hopId != null && hopId !== t.id)}
              hidden={!!chosen && chosen.id !== t.id}
              lit={hopId === t.id}
              won={!!chosen && chosen.id === t.id}
            />
          );
        })}

      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111114' },
  prompt: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  promptText: { ...typography.title1, color: '#FFFFFF', textAlign: 'center' },
  holdText: { position: 'absolute', top: 90, alignSelf: 'center', ...typography.headline, color: 'rgba(255,255,255,0.85)' },
  // Wider than the ring so long names fit (up to two lines), centred on the finger
  ringWrap: { position: 'absolute', width: LABEL_W, alignItems: 'center' },
  halo: { padding: HALO, borderRadius: RING / 2 + HALO },
  // Winner on its own flood colour: a white halo + shadow to separate photo from background
  haloOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  ring: { width: RING, height: RING, borderRadius: RING / 2, borderWidth: 5, overflow: 'hidden', backgroundColor: colors.primaryMuted },
  ringPhoto: { width: '100%', height: '100%' },
  ringLabel: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, maxWidth: LABEL_W },
  ringLabelText: { ...typography.captionMedium, color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  reveal: { position: 'absolute', overflow: 'hidden' },
});
