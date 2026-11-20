import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, {
  FadeInDown,
  withDelay,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import {
  SessionFilters,
  CUISINE_OPTIONS,
  STYLE_OPTIONS,
} from '../types';
import { useTranslation } from '../i18n/t';
import { Glass } from './ui/Glass';

interface FilterPickerProps {
  filters: SessionFilters;
  onChange: (filters: SessionFilters) => void;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      hitSlop={4}
    >
      {/* Native Liquid Glass; selected chips are tinted with the brand orange */}
      <Glass
        radius={borderRadius.full}
        interactive
        tint={selected ? colors.primary : undefined}
        style={styles.chip}
      >
        {selected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Glass>
    </Pressable>
  );
}

function cuisineChipLabel(opt: (typeof CUISINE_OPTIONS)[number]): string {
  return `${opt.label.split(' ')[0]} ${opt.labelEn}`;
}

type PartProps = { filters: SessionFilters; onChange: (filters: SessionFilters) => void };

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/** Every cuisine at once — on its own page there is room, no "show more". */
export function CuisinePicker({ filters, onChange }: PartProps) {
  return (
    <View style={styles.chipWrap}>
      {CUISINE_OPTIONS.map((opt) => (
        <Chip
          key={opt.key}
          label={cuisineChipLabel(opt)}
          selected={filters.cuisines.includes(opt.key)}
          onPress={() => onChange({ ...filters, cuisines: toggle(filters.cuisines, opt.key) })}
        />
      ))}
    </View>
  );
}

const VIBES = [
  { key: 'fast', icon: 'flash', label: 'filters.vibeFast' },
  { key: 'casual', icon: 'restaurant', label: 'filters.vibeCasual' },
  { key: 'premium', icon: 'diamond', label: 'filters.vibePremium' },
] as const;

/** Three plates on the table — tap one and it fills, like a dish arriving. Pick any. */
export function VibePicker({ filters, onChange }: PartProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.plates}>
      {VIBES.map(({ key, icon, label }) => (
        <Plate
          key={key}
          icon={icon}
          label={t(label)}
          selected={filters.styles.includes(key)}
          onPress={() => onChange({ ...filters, styles: toggle(filters.styles, key) })}
        />
      ))}
      {/* Kosher speaks the same language: a fourth plate */}
      <Plate
        icon="shield-checkmark"
        label={t('filters.kosher')}
        selected={filters.kosherOnly}
        onPress={() => onChange({ ...filters, kosherOnly: !filters.kosherOnly })}
      />
    </View>
  );
}

function Plate({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(selected ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
        if (!selected) pop.set(withSequence(withTiming(1.08, { duration: 110 }), withSpring(1, { duration: 320, dampingRatio: 0.55 })));
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={styles.plateCell}
    >
      <Animated.View style={popStyle}>
        <Glass
          radius={PLATE / 2}
          interactive
          tint={selected ? 'rgba(255, 107, 53, 0.9)' : 'rgba(255, 255, 255, 0.6)'}
          style={styles.plate}
        >
          <Ionicons name={icon} size={30} color={selected ? '#FFFFFF' : colors.primary} />
        </Glass>
      </Animated.View>
      <Text style={[styles.plateLabel, selected && styles.plateLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const PLATE = 76;

/** Kosher as a certificate: turning it on stamps it onto the card. */
export function KosherCard({ filters, onChange }: PartProps) {
  const { t } = useTranslation();
  const on = filters.kosherOnly;
  const scale = useSharedValue(on ? 1 : 0.9);
  const tilt = useSharedValue(on ? -12 : 0);

  const toggle = () => {
    if (!on) {
      // The stamp comes down big and lands with a thud.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      scale.set(withSequence(withTiming(1.8, { duration: 0 }), withSpring(1, { duration: 360, dampingRatio: 0.5 })));
      tilt.set(withSequence(withTiming(4, { duration: 0 }), withSpring(-12, { duration: 360, dampingRatio: 0.6 })));
    } else {
      Haptics.selectionAsync();
      scale.set(withTiming(0.9, { duration: 180 }));
      tilt.set(withTiming(0, { duration: 180 }));
    }
    onChange({ ...filters, kosherOnly: !on });
  };

  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${tilt.get()}deg` }],
  }));

  return (
    <Pressable onPress={toggle} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={t('filters.kosher')}>
      <Glass radius={borderRadius.lg} interactive tint="rgba(255, 255, 255, 0.6)" style={styles.kosherRow}>
        <View style={styles.kosherInfo}>
          <Text style={[styles.vibeLabel, styles.textStart]}>{t('filters.kosher')}</Text>
          <Text style={styles.sectionHint}>{t('filters.kosherHint')}</Text>
        </View>
        <Animated.View style={stampStyle}>
          <Glass
            radius={36}
            interactive
            tint={on ? 'rgba(255, 107, 53, 0.88)' : 'rgba(255, 255, 255, 0.6)'}
            style={[styles.stamp, on ? styles.stampOn : styles.stampOff]}
          >
          <View style={[styles.stampInner, on && styles.stampInnerOn]}>
            <Text style={[styles.stampText, on && styles.stampTextOn]} numberOfLines={1} adjustsFontSizeToFit>
              {t('filters.kosherStamp')}
            </Text>
          </View>
          </Glass>
        </Animated.View>
      </Glass>
    </Pressable>
  );
}

const COIN = 68;
const COIN_GAP = 12;
const COIN_ROW = COIN * 4 + COIN_GAP * 3;

/**
 * Price as coins you fill, like a star rating: tap a coin or drag along the row.
 * The coins up to your pick light up one after another, a tap per coin.
 */
export function PricePicker({ filters, onChange }: PartProps) {
  const { t } = useTranslation();
  const level = filters.maxPriceLevel;
  const descs = [
    t('filters.priceBudget'),
    t('filters.priceModerate'),
    t('filters.pricePricey'),
    t('filters.priceSplurge'),
  ];

  const pick = (lv: number) => {
    if (lv === filters.maxPriceLevel) return;
    Haptics.selectionAsync();
    onChange({ ...filters, maxPriceLevel: lv as 1 | 2 | 3 | 4 });
  };

  const levelAt = (x: number) => {
    'worklet';
    return Math.min(4, Math.max(1, Math.floor(x / (COIN + COIN_GAP)) + 1));
  };
  const drag = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => scheduleOnRN(pick, levelAt(e.x)))
    .onUpdate((e) => scheduleOnRN(pick, levelAt(e.x)));

  return (
    <View style={styles.priceHero}>
      <GestureDetector gesture={drag}>
        <View
          style={styles.coins}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('filters.maxPrice')}
          accessibilityValue={{ text: `${'₪'.repeat(level)} ${descs[level - 1]}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'increment') pick(Math.min(4, level + 1));
            if (e.nativeEvent.actionName === 'decrement') pick(Math.max(1, level - 1));
          }}
        >
          {[1, 2, 3, 4].map((n) => (
            <Coin key={n} lit={n <= level} delay={(n - 1) * 60} />
          ))}
        </View>
      </GestureDetector>
      <Text style={styles.priceDescBig}>
        <Text style={styles.priceSigns}>{'₪'.repeat(level)}</Text>
        {'  '}
        {descs[level - 1]}
      </Text>
    </View>
  );
}

function Coin({ lit, delay }: { lit: boolean; delay: number }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withDelay(
          lit ? delay : 0,
          withSequence(withTiming(lit ? 1.12 : 0.94, { duration: 110 }), withSpring(1, { duration: 300, dampingRatio: 0.55 })),
        ),
      },
    ],
  }));
  return (
    <Animated.View style={style} pointerEvents="none">
      <Glass
        radius={COIN / 2}
        tint={lit ? 'rgba(255, 107, 53, 0.9)' : 'rgba(255, 255, 255, 0.6)'}
        style={styles.coin}
      >
        <Text style={[styles.coinSign, lit && styles.coinSignLit]}>₪</Text>
      </Glass>
    </Animated.View>
  );
}

export default function FilterPicker({ filters, onChange }: FilterPickerProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('filters.cuisine')}</Text>
        <CuisinePicker filters={filters} onChange={onChange} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('filters.vibe')}</Text>
        <VibePicker filters={filters} onChange={onChange} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('filters.maxPrice')}</Text>
        <PricePicker filters={filters} onChange={onChange} />
      </View>
      <KosherCard filters={filters} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  expandToggle: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  expandToggleText: {
    ...typography.footnote,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },

  flex: { flex: 1 },
  plates: { flexDirection: 'row', justifyContent: 'space-between' },
  plateCell: { alignItems: 'center', gap: spacing.sm, width: 84 },
  plate: { width: PLATE, height: PLATE, alignItems: 'center', justifyContent: 'center' },
  plateLabel: { ...typography.subheadline, color: colors.textSecondary, textAlign: 'center' },
  plateLabelSelected: { color: colors.text, fontWeight: '600' },
  vibeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeIconSelected: { backgroundColor: colors.primary },
  textStart: { textAlign: 'auto' },
  vibeLabel: { ...typography.headline, color: colors.text, textAlign: 'center' },
  stamp: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  stampOff: { borderColor: colors.border, borderStyle: 'dashed', opacity: 0.7 },
  stampOn: { borderColor: 'rgba(255,255,255,0.6)' },
  stampInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stampInnerOn: { borderColor: 'rgba(255,255,255,0.7)' },
  stampText: { ...typography.caption1, fontWeight: '800', color: colors.textMuted, paddingHorizontal: 4 },
  stampTextOn: { color: '#FFFFFF' },
  priceHero: { gap: spacing.lg, alignItems: 'center' },
  coins: { flexDirection: 'row', gap: COIN_GAP, width: COIN_ROW, direction: 'ltr' },
  coin: { width: COIN, height: COIN, alignItems: 'center', justifyContent: 'center' },
  coinSign: { fontSize: 30, lineHeight: 36, fontWeight: '600', color: colors.primary },
  coinSignLit: { color: '#FFFFFF' },
  priceSigns: { color: colors.primaryDark, fontWeight: '600' },
  priceDescBig: { ...typography.title3, color: colors.text, textAlign: 'center' },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  priceValue: {
    ...typography.title3,
    color: colors.primaryDark,
  },
  priceValueDesc: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  priceScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  priceTick: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textMuted,
  },
  priceTickActive: { color: colors.primaryDark },

  kosherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  kosherInfo: {
    flex: 1,
    gap: 2,
  },
});
