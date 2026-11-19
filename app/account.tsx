import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius, shadows } from '../src/theme/spacing';
import { Button } from '../src/components/ui/Button';
import { useAuthStore } from '../src/store/authStore';
import { useTranslation } from '../src/i18n/t';
import {
  SUPPORTED_LOCALES,
  LOCALE_META,
  type AppLocale,
} from '../src/i18n/localeStore';

export default function AccountScreen() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const providerLabel =
    user?.provider === 'google'
      ? t('account.providerGoogle')
      : user?.provider === 'email'
        ? t('account.providerEmail')
        : t('account.providerGuest');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('account.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t('account.displayName')}</Text>
        <Text style={styles.value}>
          {user?.displayName || user?.email?.split('@')[0] || '—'}
        </Text>

        <Text style={[styles.label, styles.labelSpaced]}>{t('account.email')}</Text>
        <Text style={styles.value}>
          {user?.email || t('account.emailNotSet')}
        </Text>

        <Text style={[styles.label, styles.labelSpaced]}>
          {t('account.signInMethod')}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{providerLabel}</Text>
        </View>
      </View>

      <View style={styles.langCard}>
        <Text style={styles.label}>{t('account.language')}</Text>
        <Text style={styles.langHint}>{t('account.languageHint')}</Text>
        {SUPPORTED_LOCALES.map((code: AppLocale) => {
          const selected = locale === code;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.langRow, selected && styles.langRowSelected]}
              onPress={() => setLocale(code)}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.langRowText, selected && styles.langRowTextSelected]}
              >
                {LOCALE_META[code].nativeName}
              </Text>
              {selected ? (
                <Text style={styles.langCheck}>✓</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {user?.provider === 'anonymous' ? (
        <Button
          title={t('account.signInUpgrade')}
          onPress={() => router.push('/auth')}
          variant="primary"
          size="lg"
          fullWidth
        />
      ) : null}

      <Button
        title={t('account.signOut')}
        onPress={async () => {
          await logout();
          router.replace('/auth');
        }}
        variant="secondary"
        size="lg"
        fullWidth
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  back: { marginBottom: spacing.lg },
  backText: { ...typography.bodyMedium, color: colors.textSecondary },
  title: { ...typography.largeTitle, color: colors.text, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...typography.captionMedium, color: colors.textMuted },
  labelSpaced: { marginTop: spacing.md },
  value: { ...typography.bodySemiBold, color: colors.text, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.captionMedium,
    color: colors.primaryDark,
  },
  langCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
  },
  langHint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  langRowText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  langRowTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  langCheck: {
    ...typography.bodySemiBold,
    color: colors.primaryDark,
  },
});
