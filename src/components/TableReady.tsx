import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography, fontFamilies } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Glass } from './ui/Glass';
import { useTranslation } from '../i18n/t';

const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';

interface Props {
  code: string;
  count: number;
  loading: boolean;
  city?: string;
  error?: string | null;
  onShare: () => void;
}

/** The table exists: the code, share / copy, and one quiet line about the places found. */
export function TableReady({ code, count, loading, city, error, onShare }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    void Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Glass radius={borderRadius.xl} tint={RESTING_TINT} style={styles.card}>
      <Text style={styles.label}>{t('create.sessionCode')}</Text>
      <Text style={styles.code} selectable accessibilityLabel={code.split('').join(' ')}>
        {code}
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={onShare} hitSlop={8} style={styles.action} accessibilityRole="button">
          <Ionicons name="share-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.actionText}>{t('create.shareCode')}</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={copy} hitSlop={8} style={styles.action} accessibilityRole="button">
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? colors.accentDark : colors.primaryDark} />
          <Text style={[styles.actionText, copied && styles.actionTextDone]}>
            {copied ? t('tableReady.copied') : t('tableReady.copy')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.separator} />
      <View style={styles.status}>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />}
        <Text style={styles.statusText}>
          {loading
            ? t('create.findingRestaurants')
            : `${t('create.restaurantsFound', { count })}${city ? ` · ${city}` : ''}`}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  label: { ...typography.footnote, color: colors.textSecondary },
  code: {
    fontFamily: fontFamilies.rounded,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionText: { ...typography.headline, color: colors.primaryDark },
  actionTextDone: { color: colors.accentDark },
  actionDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: colors.border },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, alignSelf: 'stretch' },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.subheadline, color: colors.textSecondary },
  error: { ...typography.footnote, color: colors.danger, textAlign: 'center' },
});
