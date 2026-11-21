import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../src/theme/colors';
import { typography, fontFamilies } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import { Glass } from '../src/components/ui/Glass';
import { GlassButton } from '../src/components/native/GlassButton';
import { HomeMosaic } from '../src/components/HomeMosaic';
import { Avatar } from '../src/components/ui/Avatar';
import { useHistoryStore } from '../src/store/historyStore';
import { openRestaurantLink } from '../src/utils/openRestaurantLink';
import { useTranslation } from '../src/i18n/t';

const SCREEN_H = Dimensions.get('window').height;
const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';
const RATINGS: { value: -1 | 0 | 1; emoji: string; label: string }[] = [
  { value: 1, emoji: '😍', label: 'enjoy.rateLoved' },
  { value: 0, emoji: '🙂', label: 'enjoy.rateOkay' },
  { value: -1, emoji: '😕', label: 'enjoy.rateNope' },
];

/**
 * After ordering: the game is over. A calm "enjoy" with what you ordered and who you're eating with,
 * a one-tap rating for later (it lands on the profile), and the way home.
 */
export default function EnjoyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const match = useHistoryStore((s) => s.matches.find((m) => m.restaurant.id === restaurantId) ?? s.matches[0]);
  const rate = useHistoryStore((s) => s.rate);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const home = () => router.replace('/');

  if (!match) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.title}>{t('enjoy.title')}</Text>
          <GlassButton title={t('enjoy.home')} onPress={home} />
        </SafeAreaView>
      </View>
    );
  }

  const r = match.restaurant;
  return (
    <View style={styles.root}>
      <HomeMosaic heightRatio={0.5} />
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <Glass radius={borderRadius.full} tint="rgba(255, 255, 255, 0.75)" style={styles.kickerPill}>
            <Text style={styles.kicker}>{t('enjoy.kicker')}</Text>
          </Glass>
          <Text style={styles.title}>{t('enjoy.title')}</Text>

          {/* What's on its way */}
          <Glass radius={borderRadius.xl} tint={RESTING_TINT} style={styles.card}>
            <Image source={{ uri: r.image }} style={styles.photo} contentFit="cover" cachePolicy="memory-disk" />
            <View style={styles.cardText}>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[r.cuisine, r.rating ? `★ ${r.rating}` : null].filter(Boolean).join(' · ')}
              </Text>
              {match.players.length > 1 ? (
                <View style={styles.faces}>
                  {match.players.slice(0, 5).map((p, i) => (
                    <View key={p.id} style={[styles.face, i > 0 && styles.faceOverlap]}>
                      <Avatar name={p.name} color={p.avatar} size={26} />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </Glass>

          {/* For later: how was it? */}
          <Text style={styles.rateTitle}>{t('enjoy.rateTitle')}</Text>
          <View style={styles.rateRow}>
            {RATINGS.map((x) => {
              const on = match.rating === x.value;
              return (
                <Pressable
                  key={x.value}
                  style={styles.rateCell}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    rate(match.key, x.value);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Glass
                    radius={borderRadius.lg}
                    interactive
                    tint={on ? 'rgba(255, 107, 53, 0.9)' : RESTING_TINT}
                    style={styles.rate}
                  >
                    <Text style={styles.rateEmoji}>{x.emoji}</Text>
                    <Text style={[styles.rateLabel, on && styles.rateLabelOn]}>{t(x.label as never)}</Text>
                  </Glass>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.rateHint}>{t('enjoy.rateHint')}</Text>
        </View>

        <View style={styles.bottom}>
          <GlassButton title={t('enjoy.home')} onPress={home} />
          {r.externalUrl ? (
            <Pressable onPress={() => openRestaurantLink(r.externalUrl!, r.source)} hitSlop={8} style={styles.reopen}>
              <Ionicons name="open-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.reopenText}>{t('enjoy.reopen')}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.lg },
  content: { flex: 1, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: SCREEN_H * 0.22 },
  kickerPill: { paddingHorizontal: 12, paddingVertical: 5 },
  kicker: { ...typography.footnote, fontWeight: '700', color: colors.primaryDark },
  title: {
    fontFamily: fontFamilies.rounded,
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },

  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, alignSelf: 'stretch', marginTop: spacing.sm },
  photo: { width: 84, height: 84, borderRadius: borderRadius.lg },
  cardText: { flex: 1, gap: 4 },
  name: { ...typography.title3, color: colors.text },
  meta: { ...typography.footnote, color: colors.textSecondary },
  faces: { flexDirection: 'row', marginTop: 4, direction: 'ltr' },
  face: { borderRadius: 15, borderWidth: 2, borderColor: '#FFFFFF' },
  faceOverlap: { marginLeft: -8 },

  rateTitle: { ...typography.headline, color: colors.text, marginTop: spacing.lg },
  rateRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  rateCell: { flex: 1 },
  rate: { alignItems: 'center', gap: 4, paddingVertical: spacing.md },
  rateEmoji: { fontSize: 28 },
  rateLabel: { ...typography.footnote, fontWeight: '600', color: colors.text },
  rateLabelOn: { color: '#FFFFFF' },
  rateHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  bottom: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md, alignItems: 'center' },
  reopen: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reopenText: { ...typography.subheadline, fontWeight: '600', color: colors.primaryDark },
});
