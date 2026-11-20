import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SessionFilters } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Glass } from './ui/Glass';
import { useTranslation } from '../i18n/t';

const COLS = 4; // budget ₪ … ₪₪₪₪
const ROWS = 3; // quick bite / casual / premium
const PAD_H = 300;
const PUCK = 72;
const SNAP = { duration: 380, dampingRatio: 0.7 };

const ROW_STYLE = ['fast', 'casual', 'premium'] as const;
const ROW_ICON: (keyof typeof Ionicons.glyphMap)[] = ['flash', 'restaurant', 'diamond'];
const ROW_LABEL = ['filters.vibeFast', 'filters.vibeCasual', 'filters.vibePremium'] as const;
const PRICE_LABEL = ['filters.priceBudget', 'filters.priceModerate', 'filters.pricePricey', 'filters.priceSplurge'] as const;

interface Props {
  filters: SessionFilters;
  onChange: (f: SessionFilters) => void;
}

/**
 * Tonight's mood as a place on a board: drag the plate — left to right is budget,
 * top to bottom goes from a quick bite to a proper night out. Untouched = anything goes.
 */
export function MoodPad({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const [w, setW] = useState(0);
  const cellW = w / COLS;
  const cellH = PAD_H / ROWS;

  const rowFromFilters = filters.styles.length === 1 ? ROW_STYLE.indexOf(filters.styles[0] as never) : -1;
  const placed = rowFromFilters >= 0;
  const col = Math.max(0, filters.maxPriceLevel - 1);
  const row = placed ? rowFromFilters : 1;

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const ready = useSharedValue(false);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setW(width);
    const cw = width / COLS;
    // Start in the middle when nothing is picked yet.
    x.set(placed ? col * cw + cw / 2 : width / 2);
    y.set(placed ? row * cellH + cellH / 2 : PAD_H / 2);
    ready.set(true);
  };

  const commit = useCallback(
    (c: number, r: number) => {
      const next: SessionFilters = { ...filters, maxPriceLevel: (c + 1) as 1 | 2 | 3 | 4, styles: [ROW_STYLE[r]] };
      if (next.maxPriceLevel === filters.maxPriceLevel && filters.styles[0] === ROW_STYLE[r] && placed) return;
      void Haptics.selectionAsync();
      onChange(next);
    },
    [filters, onChange, placed],
  );

  const reset = () => {
    void Haptics.selectionAsync();
    onChange({ ...filters, styles: [], maxPriceLevel: 4 });
    x.set(withSpring(w / 2, SNAP));
    y.set(withSpring(PAD_H / 2, SNAP));
  };

  const cellAt = (px: number, py: number) => {
    'worklet';
    const c = Math.min(COLS - 1, Math.max(0, Math.floor(px / (w / COLS))));
    const r = Math.min(ROWS - 1, Math.max(0, Math.floor(py / (PAD_H / ROWS))));
    return { c, r };
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      x.set(withTiming(Math.min(w, Math.max(0, e.x)), { duration: 120 }));
      y.set(withTiming(Math.min(PAD_H, Math.max(0, e.y)), { duration: 120 }));
      const { c, r } = cellAt(e.x, e.y);
      scheduleOnRN(commit, c, r);
    })
    .onUpdate((e) => {
      x.set(Math.min(w, Math.max(0, e.x)));
      y.set(Math.min(PAD_H, Math.max(0, e.y)));
      const { c, r } = cellAt(e.x, e.y);
      scheduleOnRN(commit, c, r);
    })
    .onFinalize(() => {
      // Settle into the middle of the cell it landed in.
      const { c, r } = cellAt(x.get(), y.get());
      x.set(withSpring(c * (w / COLS) + w / COLS / 2, SNAP));
      y.set(withSpring(r * (PAD_H / ROWS) + PAD_H / ROWS / 2, SNAP));
    });

  const puckStyle = useAnimatedStyle(() => ({
    opacity: ready.get() ? 1 : 0,
    transform: [{ translateX: x.get() - PUCK / 2 }, { translateY: y.get() - PUCK / 2 }],
  }));

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.pad}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('create.qMood')}
          accessibilityValue={{
            text: placed ? `${t(ROW_LABEL[row])}, ${t(PRICE_LABEL[col])}` : t('create.moodAny'),
          }}
        >
          {/* rows: quick bite → premium */}
          {ROW_ICON.map((icon, r) => (
            <View key={icon} style={[styles.row, { top: r * cellH, height: cellH }, r % 2 === 1 && styles.rowAlt]}>
              <Ionicons name={icon} size={16} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{t(ROW_LABEL[r])}</Text>
            </View>
          ))}
          {/* the board's grid */}
          {Array.from({ length: COLS - 1 }).map((_, i) => (
            <View key={i} style={[styles.colLine, { left: (i + 1) * cellW }]} />
          ))}
          {/* the plate you move */}
          <Animated.View style={[styles.puckWrap, puckStyle]} pointerEvents="none">
            <Glass
              radius={PUCK / 2}
              tint={placed ? 'rgba(255, 107, 53, 0.9)' : 'rgba(255, 255, 255, 0.75)'}
              style={styles.puck}
            >
              {placed ? (
                <>
                  <Ionicons name={ROW_ICON[row]} size={22} color="#FFFFFF" />
                  <Text style={styles.puckPrice}>{'₪'.repeat(col + 1)}</Text>
                </>
              ) : (
                <Ionicons name="hand-left-outline" size={24} color={colors.primary} />
              )}
            </Glass>
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.axis}>
        <Text style={styles.axisLabel}>₪ {t('create.moodCheap')}</Text>
        <Text style={styles.axisLabel}>{t('create.moodPricey')} ₪₪₪₪</Text>
      </View>

      <View style={styles.readout}>
        <Text style={styles.readoutText}>
          {placed ? `${t(ROW_LABEL[row])} · ${t(PRICE_LABEL[col])}` : t('create.moodAny')}
        </Text>
        {placed && (
          <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
            <Text style={styles.reset}>{t('create.moodAny')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  pad: {
    height: PAD_H,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    direction: 'ltr',
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
  },
  rowAlt: { backgroundColor: colors.background },
  rowLabel: { ...typography.caption1, fontWeight: '600', color: colors.textMuted },
  colLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  puckWrap: { position: 'absolute', left: 0, top: 0, width: PUCK, height: PUCK },
  puck: { width: PUCK, height: PUCK, alignItems: 'center', justifyContent: 'center', gap: 2 },
  puckPrice: { ...typography.caption1, fontWeight: '700', color: '#FFFFFF' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs, direction: 'ltr' },
  axisLabel: { ...typography.footnote, color: colors.textSecondary },
  readout: { alignItems: 'center', gap: 4, minHeight: 48 },
  readoutText: { ...typography.title3, color: colors.text, textAlign: 'center' },
  reset: { ...typography.footnote, fontWeight: '600', color: colors.primaryDark },
});
