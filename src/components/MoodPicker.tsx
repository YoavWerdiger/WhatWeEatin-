import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SessionFilters } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Glass } from './ui/Glass';
import { useTranslation } from '../i18n/t';

type Style = 'fast' | 'casual' | 'premium';

const KINDS: { style: Style | null; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { style: 'fast', icon: 'flash', label: 'filters.vibeFast' },
  { style: 'casual', icon: 'restaurant', label: 'filters.vibeCasual' },
  { style: 'premium', icon: 'diamond', label: 'filters.vibePremium' },
  { style: null, icon: 'sparkles', label: 'create.moodAny' },
];

const LEVELS = 4;
const SIGNS = ['₪', '₪₪', '₪₪₪', '₪₪₪₪'];
const THUMB = 44;
const TRACK_H = 56;
const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';
// A short glide, no overshoot — the bouncy spring wobbled too much
const GLIDE = { duration: 200, easing: Easing.out(Easing.cubic) };

interface Props {
  filters: SessionFilters;
  onChange: (f: SessionFilters) => void;
}

/** Budget as a glass slider: drag (or tap) — it snaps to ₪ … ₪₪₪₪ with a tick on each step. */
function BudgetSlider({ level, onLevel }: { level: number; onLevel: (l: 1 | 2 | 3 | 4) => void }) {
  const [w, setW] = useState(0);
  const span = Math.max(1, w - THUMB - 12); // inner track, padded 6 each side
  const step = span / (LEVELS - 1);
  const x = useSharedValue(0);
  const startX = useSharedValue(0);
  const lastIdx = useSharedValue(level - 1);

  useEffect(() => {
    if (w > 0) x.value = withTiming((level - 1) * step, GLIDE);
  }, [w, level, step, x]);

  const tick = () => void Haptics.selectionAsync();
  const commit = (idx: number) => onLevel((idx + 1) as 1 | 2 | 3 | 4);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
    })
    .onUpdate((e) => {
      const nx = Math.min(span, Math.max(0, startX.value + e.translationX));
      x.value = nx;
      const idx = Math.round(nx / step);
      if (idx !== lastIdx.value) {
        lastIdx.value = idx;
        scheduleOnRN(tick);
      }
    })
    .onEnd(() => {
      const idx = Math.round(x.value / step);
      x.value = withTiming(idx * step, GLIDE);
      scheduleOnRN(commit, idx);
    });
  const tap = Gesture.Tap().onEnd((e) => {
    const idx = Math.min(LEVELS - 1, Math.max(0, Math.round((e.x - 6 - THUMB / 2) / step)));
    lastIdx.value = idx;
    x.value = withTiming(idx * step, GLIDE);
    scheduleOnRN(tick);
    scheduleOnRN(commit, idx);
  });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      {/* Physical left→right in every language, so the thumb follows the finger under RTL too */}
      <View style={styles.ltr} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        <Glass radius={borderRadius.full} interactive tint={RESTING_TINT} style={styles.track}>
          {/* The stops, under everything */}
          <View style={styles.stops} pointerEvents="none">
            {SIGNS.map((s) => (
              <Text key={s} style={styles.stopText}>
                {s}
              </Text>
            ))}
          </View>
          <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none">
            <Text style={styles.thumbText} numberOfLines={1} adjustsFontSizeToFit>
              {SIGNS[level - 1]}
            </Text>
          </Animated.View>
        </Glass>
      </View>
    </GestureDetector>
  );
}

/** Tonight's mood as two plain questions: what kind of meal, and up to what budget. */
export function MoodPicker({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const style = (filters.styles.length === 1 ? filters.styles[0] : null) as Style | null;

  const setStyle = (s: Style | null) => {
    void Haptics.selectionAsync();
    onChange({ ...filters, styles: s ? [s] : [] });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t('create.moodKind')}</Text>
      <View style={styles.kinds}>
        {KINDS.map((k) => {
          const on = style === k.style;
          return (
            <Pressable key={k.label} onPress={() => setStyle(k.style)} style={styles.kindCell}>
              <Glass
                radius={borderRadius.lg}
                interactive
                tint={on ? 'rgba(255, 107, 53, 0.9)' : RESTING_TINT}
                style={styles.kind}
              >
                <Ionicons name={k.icon} size={24} color={on ? '#FFFFFF' : colors.primary} />
                <Text style={[styles.kindText, on && styles.kindTextOn]} numberOfLines={1}>
                  {t(k.label as never)}
                </Text>
              </Glass>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t('create.moodBudget')}</Text>
      <BudgetSlider
        level={filters.maxPriceLevel}
        onLevel={(l) => onChange({ ...filters, maxPriceLevel: l })}
      />
      <Text style={styles.hint}>
        {filters.maxPriceLevel === 4 ? t('create.moodBudgetAny') : t('create.moodBudgetUpTo')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  label: { ...typography.headline, color: colors.text, marginTop: spacing.sm },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kindCell: { flexBasis: '47%', flexGrow: 1 },
  kind: { alignItems: 'center', gap: 6, paddingVertical: spacing.md },
  kindText: { ...typography.subheadline, fontWeight: '600', color: colors.text },
  kindTextOn: { color: '#FFFFFF' },

  ltr: { direction: 'ltr' },
  track: { height: TRACK_H, justifyContent: 'center', overflow: 'hidden' },
  stops: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6 + THUMB / 2 - 14,
  },
  stopText: { ...typography.footnote, fontWeight: '600', color: colors.textMuted, width: 28, textAlign: 'center' },
  fill: {
    position: 'absolute',
    left: 6,
    top: 6,
    bottom: 6,
    borderRadius: (TRACK_H - 12) / 2,
    backgroundColor: colors.primaryMuted,
  },
  thumb: {
    position: 'absolute',
    left: 6,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbText: { ...typography.footnote, fontWeight: '800', color: '#FFFFFF', paddingHorizontal: 4 },
  hint: { ...typography.footnote, color: colors.textSecondary },
});
