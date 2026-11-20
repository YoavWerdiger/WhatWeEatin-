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
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
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

export function VibePicker({ filters, onChange }: PartProps) {
  return (
    <View style={styles.chipWrap}>
      {STYLE_OPTIONS.map((opt) => (
        <Chip
          key={opt.key}
          label={`${opt.label.split(' ')[0]} ${opt.labelEn}`}
          selected={filters.styles.includes(opt.key)}
          onPress={() => onChange({ ...filters, styles: toggle(filters.styles, opt.key) })}
        />
      ))}
    </View>
  );
}

/** Kosher as a glass card: tap anywhere to flip it, the switch shows the state. */
export function KosherCard({ filters, onChange }: PartProps) {
  const { t } = useTranslation();
  const on = filters.kosherOnly;
  const flip = () => {
    Haptics.selectionAsync();
    onChange({ ...filters, kosherOnly: !on });
  };
  return (
    <Pressable onPress={flip} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <Glass radius={borderRadius.lg} interactive tint={on ? 'rgba(255, 107, 53, 0.22)' : undefined} style={styles.kosherRow}>
        <View style={styles.kosherInfo}>
          <Text style={styles.sectionTitle}>{t('filters.kosher')}</Text>
          <Text style={styles.sectionHint}>{t('filters.kosherHint')}</Text>
        </View>
        <Switch
          value={on}
          onValueChange={flip}
          trackColor={{ true: colors.primary, false: undefined }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Glass>
    </Pressable>
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
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
  },
  kosherInfo: {
    flex: 1,
    gap: 2,
  },
});
