import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SessionFilters } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { useTranslation } from '../i18n/t';

type Style = 'fast' | 'casual' | 'premium';

const KINDS: { style: Style | null; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { style: 'fast', icon: 'flash', label: 'filters.vibeFast' },
  { style: 'casual', icon: 'restaurant', label: 'filters.vibeCasual' },
  { style: 'premium', icon: 'diamond', label: 'filters.vibePremium' },
  { style: null, icon: 'sparkles', label: 'create.moodAny' },
];

const PRICES: { level: 1 | 2 | 3 | 4; sign: string }[] = [
  { level: 1, sign: '₪' },
  { level: 2, sign: '₪₪' },
  { level: 3, sign: '₪₪₪' },
  { level: 4, sign: '₪₪₪₪' },
];

interface Props {
  filters: SessionFilters;
  onChange: (f: SessionFilters) => void;
}

/** Tonight's mood as two plain questions: what kind of meal, and up to what budget. */
export function MoodPicker({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const style = (filters.styles.length === 1 ? filters.styles[0] : null) as Style | null;

  const setStyle = (s: Style | null) => {
    void Haptics.selectionAsync();
    onChange({ ...filters, styles: s ? [s] : [] });
  };
  const setPrice = (level: 1 | 2 | 3 | 4) => {
    void Haptics.selectionAsync();
    onChange({ ...filters, maxPriceLevel: level });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t('create.moodKind')}</Text>
      <View style={styles.kinds}>
        {KINDS.map((k) => {
          const on = style === k.style;
          return (
            <Pressable key={k.label} onPress={() => setStyle(k.style)} style={[styles.kind, on && styles.kindOn]}>
              <Ionicons name={k.icon} size={24} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.kindText, on && styles.kindTextOn]} numberOfLines={1}>
                {t(k.label as never)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t('create.moodBudget')}</Text>
      <View style={styles.prices}>
        {PRICES.map((p) => {
          // «Up to» this level: everything at or below it reads as selected
          const on = p.level <= filters.maxPriceLevel;
          return (
            <Pressable key={p.level} onPress={() => setPrice(p.level)} style={[styles.price, on && styles.priceOn]}>
              <Text style={[styles.priceText, on && styles.priceTextOn]}>{p.sign}</Text>
            </Pressable>
          );
        })}
      </View>
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
  kind: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
  },
  kindOn: { backgroundColor: colors.primary },
  kindText: { ...typography.subheadline, fontWeight: '600', color: colors.text },
  kindTextOn: { color: colors.onPrimary },
  prices: { flexDirection: 'row', gap: 6 },
  price: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: colors.card },
  priceOn: { backgroundColor: colors.primaryMuted },
  priceText: { ...typography.headline, color: colors.textMuted },
  priceTextOn: { color: colors.primaryDark },
  hint: { ...typography.footnote, color: colors.textSecondary },
});
