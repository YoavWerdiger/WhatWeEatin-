import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import type { Restaurant } from '../types';
import { colors } from '../theme/colors';
import { typography, fontFamilies } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Glass } from './ui/Glass';
import { useTranslation } from '../i18n/t';

const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';
const FACES = 5;

interface Props {
  code: string;
  restaurants: Restaurant[];
  loading: boolean;
  city?: string;
  error?: string | null;
  onShare: () => void;
}

/**
 * The moment the table exists: the code deals in letter by letter, then two glass actions
 * (share / copy) and a peek at the places tonight's game will draw from.
 */
export function TableReady({ code, restaurants, loading, city, error, onShare }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    void Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const faces = restaurants.slice(0, FACES);
  const more = restaurants.length - faces.length;

  return (
    <View style={styles.root}>
      {/* The code, one tile per character */}
      <View style={styles.codeRow} accessible accessibilityLabel={code.split('').join(' ')}>
        {code.split('').map((ch, i) => (
          // Glass stays still (it skips its effect under an animating ancestor); the letter fades in, gently
          <Glass key={i} radius={borderRadius.md} tint={RESTING_TINT} style={styles.tile}>
            <Animated.Text entering={FadeInDown.delay(120 + i * 45).duration(220)} style={styles.tileText}>
              {ch}
            </Animated.Text>
          </Glass>
        ))}
      </View>

      {/* Share / copy */}
      <View style={styles.actions}>
        <Pressable onPress={onShare} style={styles.actionCell} accessibilityRole="button">
          <Glass radius={borderRadius.full} interactive tint="rgba(255, 107, 53, 0.9)" style={styles.action}>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.actionText, styles.actionTextOn]}>{t('create.shareCode')}</Text>
          </Glass>
        </Pressable>
        <Pressable onPress={copy} style={styles.actionCell} accessibilityRole="button">
          <Glass radius={borderRadius.full} interactive tint={RESTING_TINT} style={styles.action}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? colors.accentDark : colors.primary} />
            <Text style={styles.actionText}>{copied ? t('tableReady.copied') : t('tableReady.copy')}</Text>
          </Glass>
        </Pressable>
      </View>

      {/* What's on the table tonight */}
      <View>
        <Glass radius={borderRadius.lg} tint={RESTING_TINT} style={styles.places}>
          {loading ? (
            <View style={styles.placesRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.placesText}>{t('create.findingRestaurants')}</Text>
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(250)} style={styles.placesRow}>
              <View style={styles.faces}>
                {faces.map((r, i) => (
                  <Animated.View key={r.id} entering={ZoomIn.delay(i * 60)} style={[styles.face, i > 0 && styles.faceOverlap]}>
                    <Image source={{ uri: r.image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                  </Animated.View>
                ))}
                {more > 0 ? (
                  <View style={[styles.face, styles.faceOverlap, styles.faceMore]}>
                    <Text style={styles.faceMoreText}>+{more}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.placesTextCol}>
                <Text style={styles.placesTitle}>{t('create.restaurantsFound', { count: restaurants.length })}</Text>
                {city ? <Text style={styles.placesText}>{city}</Text> : null}
              </View>
            </Animated.View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Glass>
      </View>
    </View>
  );
}

const FACE = 40;

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, direction: 'ltr' },
  tile: { width: 48, height: 64, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fontFamilies.rounded, fontSize: 34, fontWeight: '900', color: colors.text },

  actions: { flexDirection: 'row', gap: spacing.sm },
  actionCell: { flex: 1 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50 },
  actionText: { ...typography.headline, color: colors.text },
  actionTextOn: { color: '#FFFFFF' },

  places: { padding: spacing.md, gap: spacing.sm },
  placesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  faces: { flexDirection: 'row', direction: 'ltr' },
  face: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: colors.primaryMuted,
  },
  faceOverlap: { marginLeft: -12 },
  faceMore: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  faceMoreText: { ...typography.caption, fontWeight: '800', color: '#FFFFFF' },
  placesTextCol: { flex: 1, gap: 2 },
  placesTitle: { ...typography.headline, color: colors.text },
  placesText: { ...typography.footnote, color: colors.textSecondary },
  error: { ...typography.footnote, color: colors.danger },
});
