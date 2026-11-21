import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { typography, fontFamilies } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import { Glass } from '../src/components/ui/Glass';
import { GlassButton } from '../src/components/native/GlassButton';
import { HomeMosaic } from '../src/components/HomeMosaic';
import { Avatar } from '../src/components/ui/Avatar';
import { useAuthStore } from '../src/store/authStore';
import { useHistoryStore } from '../src/store/historyStore';
import { openRestaurantLink } from '../src/utils/openRestaurantLink';
import { useTranslation } from '../src/i18n/t';

const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';

/**
 * Profile, Wolt-home style: who you are, a few numbers, your past matches to order again,
 * the friends you've eaten with, then settings. History lives on the device (historyStore).
 */
export default function AccountScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const matches = useHistoryStore((s) => s.matches);

  const isGuest = !user || user.provider === 'anonymous';
  const name = user?.displayName || user?.email?.split('@')[0] || t('account.providerGuest');
  const providerLabel =
    user?.provider === 'google'
      ? t('account.providerGoogle')
      : user?.provider === 'email'
        ? t('account.providerEmail')
        : t('account.providerGuest');

  // Friends = everyone you've shared a match with (not you), most meals first
  const friends = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; avatar?: string; count: number }>();
    for (const m of matches) {
      for (const p of m.players) {
        if (p.id === user?.uid) continue;
        const prev = byId.get(p.id);
        byId.set(p.id, { id: p.id, name: p.name, avatar: p.avatar, count: (prev?.count ?? 0) + 1 });
      }
    }
    return [...byId.values()].sort((a, b) => b.count - a.count);
  }, [matches, user?.uid]);

  const topCuisines = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of matches) if (m.restaurant.cuisine) count.set(m.restaurant.cuisine, (count.get(m.restaurant.cuisine) ?? 0) + 1);
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, n]) => ({ name, count: n }));
  }, [matches]);
  const orderedCount = matches.filter((m) => m.ordered).length;
  const lovedCount = matches.filter((m) => m.rating === 1).length;

  const formatDate = (at: number) =>
    new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return (
    <View style={styles.root}>
      <HomeMosaic heightRatio={0.42} photos={matches.map((m) => m.restaurant.image)} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Glass radius={borderRadius.full} interactive tint={RESTING_TINT} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Glass>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel={t('profile.settings')}>
            <Glass radius={borderRadius.full} interactive tint={RESTING_TINT} style={styles.backBtn}>
              <Ionicons name="settings-outline" size={21} color={colors.text} />
            </Glass>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Who you are */}
          <View style={styles.head}>
            <View style={styles.avatarRing}>
              <Avatar name={name} size={84} />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Glass radius={borderRadius.full} tint={RESTING_TINT} style={styles.providerChip}>
              <Ionicons name={isGuest ? 'person-outline' : 'shield-checkmark'} size={14} color={colors.primaryDark} />
              <Text style={styles.providerText}>{providerLabel}</Text>
            </Glass>
            {isGuest ? (
              <View style={styles.signInCta}>
                <GlassButton title={t('account.signInUpgrade')} onPress={() => router.push('/auth')} />
              </View>
            ) : null}
          </View>

          {/* Your food story as a few bold tiles — big numbers, one idea each, no zeros */}
          {matches.length > 0 ? (
            <View style={styles.tiles}>
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tile, styles.tileHero]}
              >
                <Text style={styles.heroNumber}>{matches.length}</Text>
                <Text style={styles.heroLabel}>{t('profile.tileMatches')}</Text>
                {orderedCount > 0 || lovedCount > 0 ? (
                  <Text style={styles.heroSub}>
                    {[
                      orderedCount > 0 ? t('profile.tileOrdered', { count: orderedCount }) : null,
                      lovedCount > 0 ? t('profile.tileLoved', { count: lovedCount }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </LinearGradient>
              <View style={styles.tileCol}>
                {topCuisines[0] ? (
                  <Glass radius={borderRadius.xl} tint={RESTING_TINT} style={styles.tile}>
                    <Text style={styles.tileKicker}>{t('profile.tileTopCuisine')}</Text>
                    <Text style={styles.tileBig} numberOfLines={1} adjustsFontSizeToFit>
                      {topCuisines[0].name}
                    </Text>
                    <Text style={styles.tileSub}>{t('profile.tileTimes', { count: topCuisines[0].count })}</Text>
                  </Glass>
                ) : null}
                {friends[0] ? (
                  <Glass radius={borderRadius.xl} tint={RESTING_TINT} style={[styles.tile, styles.tileBuddy]}>
                    <Avatar name={friends[0].name} color={friends[0].avatar} size={36} />
                    <View style={styles.flex}>
                      <Text style={styles.tileKicker}>{t('profile.tileBuddy')}</Text>
                      <Text style={styles.tileName} numberOfLines={1}>
                        {friends[0].name}
                      </Text>
                      <Text style={styles.tileSub}>{t('profile.mealsTogether', { count: friends[0].count })}</Text>
                    </View>
                  </Glass>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Your matches — order again */}
          <Text style={styles.section}>{t('profile.yourMatches')}</Text>
          {matches.length === 0 ? (
            <Glass radius={borderRadius.lg} tint={RESTING_TINT} style={styles.empty}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
              <Text style={styles.emptyTitle}>{t('profile.emptyTitle')}</Text>
              <Text style={styles.emptySub}>{t('profile.emptySub')}</Text>
              <View style={styles.emptyCta}>
                <GlassButton title={t('home.createSession')} onPress={() => router.push('/session/create')} />
              </View>
            </Glass>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {matches.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => m.restaurant.externalUrl && openRestaurantLink(m.restaurant.externalUrl, m.restaurant.source)}
                  style={styles.matchCard}
                >
                  <View>
                    <Image source={{ uri: m.restaurant.image }} style={styles.matchPhoto} contentFit="cover" cachePolicy="memory-disk" />
                    {m.rating != null ? (
                      <View style={styles.matchRating}>
                        <Text style={styles.matchRatingText}>{m.rating === 1 ? '😍' : m.rating === 0 ? '🙂' : '😕'}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.matchName} numberOfLines={1}>
                    {m.restaurant.name}
                  </Text>
                  <Text style={styles.matchMeta} numberOfLines={1}>
                    {formatDate(m.at)} · {m.restaurant.cuisine}
                  </Text>
                  {/* Under the photo, a glass pill to reorder */}
                  {m.restaurant.externalUrl ? (
                    <Glass radius={borderRadius.full} interactive tint="rgba(255, 107, 53, 0.16)" style={styles.orderPill}>
                      <Ionicons name="bag-handle-outline" size={14} color={colors.primaryDark} />
                      <Text style={styles.orderPillText}>{t('profile.orderAgain')}</Text>
                    </Glass>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Friends you've eaten with */}
          {friends.length > 0 ? (
            <>
              <Text style={styles.section}>{t('profile.ateWith')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {friends.map((f) => (
                  <View key={f.id} style={styles.friend}>
                    <Avatar name={f.name} color={f.avatar} size={56} />
                    <Text style={styles.friendName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={styles.friendMeta}>{t('profile.mealsTogether', { count: f.count })}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  head: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  avatarRing: { padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.9)' },
  name: {
    fontFamily: fontFamilies.rounded,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.text,
  },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  providerText: { ...typography.captionMedium, color: colors.primaryDark },
  signInCta: { alignSelf: 'stretch', marginTop: spacing.sm },

  tiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  tileCol: { flex: 1, gap: spacing.sm },
  tile: { padding: spacing.md, gap: 2, flex: 1 },
  tileHero: { borderRadius: borderRadius.xl, borderCurve: 'continuous', justifyContent: 'flex-end', minHeight: 190 },
  heroNumber: { fontFamily: fontFamilies.rounded, fontSize: 64, lineHeight: 68, fontWeight: '900', color: '#FFFFFF' },
  heroLabel: { ...typography.headline, color: '#FFFFFF' },
  heroSub: { ...typography.footnote, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  tileKicker: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  tileBig: { fontFamily: fontFamilies.rounded, fontSize: 24, lineHeight: 28, fontWeight: '900', color: colors.text },
  tileName: { ...typography.headline, color: colors.text },
  tileSub: { ...typography.caption, color: colors.textSecondary },
  tileBuddy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  section: { ...typography.title3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  rail: { gap: spacing.sm, paddingRight: spacing.lg },
  matchCard: { width: 156 },
  matchPhoto: { width: 156, height: 112, borderRadius: borderRadius.lg },
  matchRating: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchRatingText: { fontSize: 16 },
  matchName: { ...typography.headline, color: colors.text, marginTop: 8 },
  matchMeta: { ...typography.footnote, color: colors.textSecondary },
  orderPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  orderPillText: { ...typography.caption, fontWeight: '700', color: colors.primaryDark },

  empty: { alignItems: 'center', gap: 6, padding: spacing.lg },
  emptyTitle: { ...typography.headline, color: colors.text, textAlign: 'center' },
  emptySub: { ...typography.footnote, color: colors.textSecondary, textAlign: 'center' },
  emptyCta: { alignSelf: 'stretch', marginTop: spacing.sm },

  friend: { width: 76, alignItems: 'center', gap: 4 },
  friendName: { ...typography.subheadline, color: colors.text, fontWeight: '600', maxWidth: 76 },
  friendMeta: { ...typography.caption, color: colors.textSecondary },

});
