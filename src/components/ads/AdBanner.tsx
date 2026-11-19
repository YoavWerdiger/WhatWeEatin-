import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useTranslation } from '../../i18n/t';
import {
  type AdPlacement,
  getBannerUnitId,
  isNativeAdsAvailable,
  shouldShowAds,
} from '../../services/ads';

type AdBannerProps = {
  placement: AdPlacement;
  /** Optional override; defaults to adaptive banner height slot. */
  style?: object;
};

/**
 * Low-risk banner slot. In Expo Go / without native SDK: labeled placeholder
 * when ads are enabled. After a dev client + AdMob install, swap in
 * BannerAd from `react-native-google-mobile-ads` (see service comments).
 */
export function AdBanner({ placement, style }: AdBannerProps) {
  const { t, isRTL } = useTranslation();

  if (!shouldShowAds(placement)) {
    return null;
  }

  const nativeReady = isNativeAdsAvailable();
  const unitId = getBannerUnitId();

  // Real BannerAd wiring lands after: install package + EAS development build.
  // Keeping this branch explicit avoids Metro resolving a missing native module.
  if (nativeReady) {
    // TODO(ads): import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
    // and render <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    if (__DEV__) {
      console.info(`[ads] Native ready for ${placement}; unit=${unitId}`);
    }
  }

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityLabel={t('ads.sponsored')}
      accessibilityRole="summary"
    >
      <View style={styles.slot}>
        <Text
          style={[styles.label, isRTL && styles.rtl]}
          numberOfLines={1}
        >
          {t('ads.sponsored')}
        </Text>
        <Text style={[styles.hint, isRTL && styles.rtl]} numberOfLines={2}>
          {nativeReady
            ? t('ads.placeholderReady')
            : t('ads.placeholderHint')}
        </Text>
        {__DEV__ ? (
          <Text style={styles.devMeta} numberOfLines={1}>
            {Platform.OS} · {placement}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  slot: {
    width: '100%',
    minHeight: 50,
    maxWidth: 360,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  devMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
});
