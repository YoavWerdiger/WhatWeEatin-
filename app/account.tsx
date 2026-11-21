import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
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
import { SUPPORTED_LOCALES, LOCALE_META, type AppLocale } from '../src/i18n/localeStore';

const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';

/**
 * Profile, Wolt-home style: who you are, a few numbers, your past matches to order again,
 * the friends you've eaten with, then settings. History lives on the device (historyStore).
 */
export default function AccountScreen() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const matches = useHistoryStore((s) => s.matches);
  const [langOpen, setLangOpen] = useState(false);

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

  const favCuisine = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of matches) if (m.restaurant.cuisine) count.set(m.restaurant.cuisine, (count.get(m.restaurant.cuisine) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [matches]);

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

          {/* A few numbers */}
          <View style={styles.stats}>
            {[
              { icon: 'restaurant' as const, value: String(matches.length), label: t('profile.matches') },
              { icon: 'people' as const, value: String(friends.length), label: t('profile.friends') },
              { icon: 'heart' as const, value: favCuisine, label: t('profile.favCuisine') },
            ].map((s) => (
              <Glass key={s.label} radius={borderRadius.lg} tint={RESTING_TINT} style={styles.stat}>
                <Ionicons name={s.icon} size={18} color={colors.primary} />
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                  {s.value}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {s.label}
                </Text>
              </Glass>
            ))}
          </View>

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
                  <Image source={{ uri: m.restaurant.image }} style={styles.matchPhoto} contentFit="cover" cachePolicy="memory-disk" />
                  <Text style={styles.matchName} numberOfLines={1}>
                    {m.restaurant.name}
                  </Text>
                  <Text style={styles.matchMeta} numberOfLines={1}>
                    {formatDate(m.at)} · {m.restaurant.cuisine}
                  </Text>
                  {m.restaurant.externalUrl ? <Text style={styles.orderAgain}>{t('profile.orderAgain')}</Text> : null}
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

          {/* Settings */}
          <Text style={styles.section}>{t('profile.settings')}</Text>
          <Glass radius={borderRadius.lg} tint={RESTING_TINT} style={styles.settings}>
            <Pressable onPress={() => setLangOpen((v) => !v)} style={styles.settingRow}>
              <Ionicons name="language" size={20} color={colors.primary} />
              <Text style={styles.settingText}>{t('account.language')}</Text>
              <Text style={styles.settingValue}>{LOCALE_META[locale as AppLocale]?.nativeName}</Text>
              <Ionicons name={langOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </Pressable>
            {langOpen
              ? SUPPORTED_LOCALES.map((code: AppLocale) => (
                  <Pressable key={code} onPress={() => setLocale(code)} style={styles.langRow}>
                    <Text style={[styles.langText, locale === code && styles.langTextOn]}>{LOCALE_META[code].nativeName}</Text>
                    {locale === code ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </Pressable>
                ))
              : null}
            <View style={styles.divider} />
            {user?.email ? (
              <>
                <View style={styles.settingRow}>
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  <Text style={styles.settingText}>{t('account.email')}</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
                <View style={styles.divider} />
              </>
            ) : null}
            <Pressable
              onPress={async () => {
                await logout();
                router.replace('/auth');
              }}
              style={styles.settingRow}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger ?? '#E5484D'} />
              <Text style={[styles.settingText, styles.signOut]}>{t('account.signOut')}</Text>
            </Pressable>
          </Glass>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
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

  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, paddingHorizontal: 6 },
  statValue: { ...typography.title2, color: colors.text, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.textSecondary },

  section: { ...typography.title3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  rail: { gap: spacing.sm, paddingRight: spacing.lg },
  matchCard: { width: 156 },
  matchPhoto: { width: 156, height: 112, borderRadius: borderRadius.lg },
  matchName: { ...typography.headline, color: colors.text, marginTop: 8 },
  matchMeta: { ...typography.footnote, color: colors.textSecondary },
  orderAgain: { ...typography.footnote, color: colors.primaryDark, fontWeight: '700', marginTop: 2 },

  empty: { alignItems: 'center', gap: 6, padding: spacing.lg },
  emptyTitle: { ...typography.headline, color: colors.text, textAlign: 'center' },
  emptySub: { ...typography.footnote, color: colors.textSecondary, textAlign: 'center' },
  emptyCta: { alignSelf: 'stretch', marginTop: spacing.sm },

  friend: { width: 76, alignItems: 'center', gap: 4 },
  friendName: { ...typography.subheadline, color: colors.text, fontWeight: '600', maxWidth: 76 },
  friendMeta: { ...typography.caption, color: colors.textSecondary },

  settings: { paddingVertical: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14 },
  settingText: { ...typography.body, color: colors.text, flex: 1 },
  settingValue: { ...typography.body, color: colors.textSecondary, maxWidth: 180 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md + 28, paddingVertical: 10 },
  langText: { ...typography.body, color: colors.textSecondary },
  langTextOn: { color: colors.text, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.md + 28 },
  signOut: { color: '#E5484D' },
});
