import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { typography, fontFamilies } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import { Glass } from '../src/components/ui/Glass';
import { useAuthStore } from '../src/store/authStore';
import { useTranslation } from '../src/i18n/t';
import { SUPPORTED_LOCALES, LOCALE_META, type AppLocale } from '../src/i18n/localeStore';

const RESTING_TINT = 'rgba(255, 255, 255, 0.6)';

/** Settings, off the profile's gear: language, account, sign out. */
export default function SettingsScreen() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isGuest = !user || user.provider === 'anonymous';
  const providerLabel =
    user?.provider === 'google'
      ? t('account.providerGoogle')
      : user?.provider === 'email'
        ? t('account.providerEmail')
        : t('account.providerGuest');

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Glass radius={borderRadius.full} interactive tint={RESTING_TINT} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Glass>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('profile.settings')}</Text>

          <Text style={styles.section}>{t('account.language')}</Text>
          <Glass radius={borderRadius.lg} tint={RESTING_TINT} style={styles.group}>
            {SUPPORTED_LOCALES.map((code: AppLocale, i) => (
              <View key={code}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable onPress={() => setLocale(code)} style={styles.row}>
                  <Text style={[styles.rowText, locale === code && styles.rowTextOn]}>{LOCALE_META[code].nativeName}</Text>
                  {locale === code ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              </View>
            ))}
          </Glass>
          <Text style={styles.hint}>{t('account.languageHint')}</Text>

          <Text style={styles.section}>{t('settings.account')}</Text>
          <Glass radius={borderRadius.lg} tint={RESTING_TINT} style={styles.group}>
            <View style={styles.row}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.rowText}>{t('account.signInMethod')}</Text>
              <Text style={styles.rowValue}>{providerLabel}</Text>
            </View>
            {user?.email ? (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  <Text style={styles.rowText}>{t('account.email')}</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </>
            ) : null}
            {isGuest ? (
              <>
                <View style={styles.divider} />
                <Pressable onPress={() => router.push('/auth')} style={styles.row}>
                  <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                  <Text style={[styles.rowText, styles.link]}>{t('account.signInUpgrade')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              </>
            ) : null}
          </Glass>

          <Glass radius={borderRadius.lg} tint={RESTING_TINT} style={[styles.group, styles.signOutGroup]}>
            <Pressable
              onPress={async () => {
                await logout();
                router.replace('/auth');
              }}
              style={styles.row}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={[styles.rowText, styles.signOut]}>{t('account.signOut')}</Text>
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
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    fontFamily: fontFamilies.rounded,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.text,
    marginTop: spacing.md,
  },
  section: { ...typography.footnote, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm, marginStart: spacing.xs },
  group: { paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14 },
  rowText: { ...typography.body, color: colors.text, flex: 1 },
  rowTextOn: { fontWeight: '600' },
  rowValue: { ...typography.body, color: colors.textSecondary, maxWidth: 190 },
  link: { color: colors.primaryDark, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginStart: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, marginStart: spacing.xs },
  signOutGroup: { marginTop: spacing.xl },
  signOut: { color: colors.danger, fontWeight: '600' },
});
