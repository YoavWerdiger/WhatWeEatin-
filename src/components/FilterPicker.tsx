import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

/** How many cuisine chips to show before "show more". */
const CUISINE_COLLAPSED_COUNT = 6;

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

function getVisibleCuisines(
  expanded: boolean,
  selectedKeys: string[],
): (typeof CUISINE_OPTIONS)[number][] {
  if (expanded || CUISINE_OPTIONS.length <= CUISINE_COLLAPSED_COUNT) {
    return [...CUISINE_OPTIONS];
  }
  const primary = CUISINE_OPTIONS.slice(0, CUISINE_COLLAPSED_COUNT);
  const primaryKeys = new Set(primary.map((o) => o.key));
  // Keep selected chips visible even when collapsed.
  const extras = CUISINE_OPTIONS.filter(
    (o) => !primaryKeys.has(o.key) && selectedKeys.includes(o.key),
  );
  return [...primary, ...extras];
}

export default function FilterPicker({ filters, onChange }: FilterPickerProps) {
  const { t } = useTranslation();
  const [cuisinesExpanded, setCuisinesExpanded] = useState(false);

  const PRICE_LABELS = [
    { level: 1 as const, label: '₪', desc: t('filters.priceBudget') },
    { level: 2 as const, label: '₪₪', desc: t('filters.priceModerate') },
    { level: 3 as const, label: '₪₪₪', desc: t('filters.pricePricey') },
    { level: 4 as const, label: '₪₪₪₪', desc: t('filters.priceSplurge') },
  ];

  const hiddenCuisineCount = Math.max(
    0,
    CUISINE_OPTIONS.length - CUISINE_COLLAPSED_COUNT,
  );
  const visibleCuisines = getVisibleCuisines(
    cuisinesExpanded,
    filters.cuisines,
  );

  const toggleCuisine = (key: string) => {
    const cuisines = filters.cuisines.includes(key)
      ? filters.cuisines.filter((c) => c !== key)
      : [...filters.cuisines, key];
    onChange({ ...filters, cuisines });
  };

  const toggleStyle = (key: string) => {
    const styles_ = filters.styles.includes(key)
      ? filters.styles.filter((s) => s !== key)
      : [...filters.styles, key];
    onChange({ ...filters, styles: styles_ });
  };

  return (
    <View style={styles.container}>
      {/* Cuisine Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('filters.cuisine')}</Text>
        <Text style={styles.sectionHint}>{t('filters.cuisineHint')}</Text>
        <View style={styles.chipWrap}>
          {visibleCuisines.map((opt) => (
            <Chip
              key={opt.key}
              label={cuisineChipLabel(opt)}
              selected={filters.cuisines.includes(opt.key)}
              onPress={() => toggleCuisine(opt.key)}
            />
          ))}
        </View>
        {hiddenCuisineCount > 0 && (
          <TouchableOpacity
            style={styles.expandToggle}
            onPress={() => {
              Haptics.selectionAsync();
              setCuisinesExpanded((v) => !v);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.expandToggleText}>
              {cuisinesExpanded
                ? t('filters.showLess')
                : t('filters.showMore', { count: hiddenCuisineCount })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Style Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('filters.vibe')}</Text>
        <View style={styles.chipWrap}>
          {STYLE_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={`${opt.label.split(' ')[0]} ${opt.labelEn}`}
              selected={filters.styles.includes(opt.key)}
              onPress={() => toggleStyle(opt.key)}
            />
          ))}
        </View>
      </View>

      {/* Price — a native slider you drag; the label follows the thumb */}
      <View style={styles.section}>
        <View style={styles.priceHeader}>
          <Text style={styles.sectionTitle}>{t('filters.maxPrice')}</Text>
          <Text style={styles.priceValue}>
            {PRICE_LABELS[filters.maxPriceLevel - 1].label}
            <Text style={styles.priceValueDesc}>{'  '}{PRICE_LABELS[filters.maxPriceLevel - 1].desc}</Text>
          </Text>
        </View>
        <StopSlider
          count={4}
          index={filters.maxPriceLevel - 1}
          onChange={(i) => onChange({ ...filters, maxPriceLevel: (i + 1) as 1 | 2 | 3 | 4 })}
          accessibilityLabel={t('filters.maxPrice')}
        />
        <View style={styles.priceScale}>
          {PRICE_LABELS.map((p) => (
            <Text
              key={p.level}
              style={[styles.priceTick, p.level <= filters.maxPriceLevel && styles.priceTickActive]}
            >
              {p.label}
            </Text>
          ))}
        </View>
      </View>

      {/* Kosher Toggle */}
      <View style={styles.kosherRow}>
        <View style={styles.kosherInfo}>
          <Text style={styles.sectionTitle}>{t('filters.kosher')}</Text>
          <Text style={styles.sectionHint}>{t('filters.kosherHint')}</Text>
        </View>
        <Switch
          value={filters.kosherOnly}
          onValueChange={(val) => {
            Haptics.selectionAsync();
            onChange({ ...filters, kosherOnly: val });
          }}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={filters.kosherOnly ? colors.primary : '#f4f4f4'}
        />
      </View>
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
