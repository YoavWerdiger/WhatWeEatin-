import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import {
  SessionFilters,
  CUISINE_OPTIONS,
  STYLE_OPTIONS,
} from '../types';
import { useTranslation } from '../i18n/t';

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
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>🎯 Vibe</Text>
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

      {/* Price Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('filters.maxPrice')}</Text>
        <View style={styles.priceRow}>
          {PRICE_LABELS.map((p) => (
            <TouchableOpacity
              key={p.level}
              style={[
                styles.priceChip,
                filters.maxPriceLevel >= p.level && styles.priceChipActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onChange({ ...filters, maxPriceLevel: p.level });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.priceLabel,
                  filters.maxPriceLevel >= p.level && styles.priceLabelActive,
                ]}
              >
                {p.label}
              </Text>
              <Text
                style={[
                  styles.priceDesc,
                  filters.maxPriceLevel >= p.level && styles.priceDescActive,
                ]}
              >
                {p.desc}
              </Text>
            </TouchableOpacity>
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
    ...typography.captionMedium,
    color: colors.primary,
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 2,
  },
  priceChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  priceLabel: {
    ...typography.bodySemiBold,
    color: colors.textMuted,
    fontSize: 14,
  },
  priceLabelActive: {
    color: colors.primary,
  },
  priceDesc: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  priceDescActive: {
    color: colors.primaryDark,
  },

  kosherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  kosherInfo: {
    flex: 1,
    gap: 2,
  },
});
