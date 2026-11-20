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
import Animated, {
  FadeInDown,
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
import { StopSlider } from './native/StopSlider';

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
          <Ionicons name={icon} size={36} color={selected ? '#FFFFFF' : colors.primaryDark} />
        </Glass>
      </Animated.View>
      <Text style={[styles.plateLabel, selected && styles.plateLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const PLATE = 96;

/** Kosher as a wide glass tile in the vibe tiles' language — tap to turn on, it pops. */
export function KosherCard({ filters, onChange }: PartProps) {
  const { t } = useTranslation();
  const on = filters.kosherOnly;
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const toggle = () => {
    Haptics.impactAsync(on ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    if (!on) pop.set(withSequence(withTiming(1.04, { duration: 120 }), withSpring(1, { duration: 300, dampingRatio: 0.6 })));
    onChange({ ...filters, kosherOnly: !on });
  };
  return (
    <Animated.View style={popStyle}>
      <Pressable onPress={toggle} accessibilityRole="switch" accessibilityState={{ checked: on }}>
        <Glass
          radius={borderRadius.lg}
          interactive
          tint={on ? 'rgba(255, 107, 53, 0.22)' : 'rgba(255, 255, 255, 0.6)'}
          style={styles.kosherRow}
        >
          <View style={[styles.vibeIcon, on && styles.vibeIconSelected]}>
            <Ionicons name="shield-checkmark" size={24} color={on ? '#FFFFFF' : colors.primaryDark} />
          </View>
          <View style={styles.kosherInfo}>
            <Text style={[styles.vibeLabel, styles.textStart]}>{t('filters.kosher')}</Text>
            <Text style={styles.sectionHint}>{t('filters.kosherHint')}</Text>
          </View>
          <Ionicons
            name={on ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={on ? colors.primary : colors.border}
          />
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

const PRICE_SIGNS = ['₪', '₪₪', '₪₪₪', '₪₪₪₪'];

/** Price as a hero: four shekel signs light up as you drag the native slider. */
export function PricePicker({ filters, onChange }: PartProps) {
  const { t } = useTranslation();
  const level = filters.maxPriceLevel;
  const descs = [
    t('filters.priceBudget'),
    t('filters.priceModerate'),
    t('filters.pricePricey'),
    t('filters.priceSplurge'),
  ];
  return (
    <View style={styles.priceHero}>
      <View style={styles.coins} accessibilityElementsHidden>
        {[1, 2, 3, 4].map((n) => (
          <PriceCoin key={n} lit={n <= level} />
        ))}
      </View>
      <Text style={styles.priceDescBig}>{descs[level - 1]}</Text>
      <StopSlider
        count={4}
        index={level - 1}
        onChange={(i) => onChange({ ...filters, maxPriceLevel: (i + 1) as 1 | 2 | 3 | 4 })}
        accessibilityLabel={t('filters.maxPrice')}
      />
      <View style={styles.priceScale}>
        {PRICE_SIGNS.map((sign, i) => (
          <Text key={sign} style={[styles.priceTick, i < level && styles.priceTickActive]}>
            {sign}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PriceCoin({ lit }: { lit: boolean }) {
  // Coins pop a little as they light up — the money "counts up" with the drag.
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(lit ? 1 : 0.18, { duration: 160 }),
    transform: [{ scale: withSpring(lit ? 1 : 0.86, { duration: 280, dampingRatio: 0.6 }) }],
  }));
  return <Animated.Text style={[styles.coin, style]}>₪</Animated.Text>;
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
  plates: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  plateCell: { alignItems: 'center', gap: spacing.sm, width: 104 },
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
  priceHero: { gap: spacing.md, alignItems: 'stretch' },
  coins: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, direction: 'ltr' },
  coin: { fontSize: 56, lineHeight: 64, fontWeight: '300', color: colors.primaryDark },
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
