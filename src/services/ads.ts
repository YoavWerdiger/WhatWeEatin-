/**
 * Ads foundations for What We Eatin'.
 *
 * Path: `react-native-google-mobile-ads` (AdMob) via Expo config plugin +
 * development / production build. `expo-ads-admob` is deprecated.
 *
 * Expo Go: native AdMob is NOT supported. Keep EXPO_PUBLIC_ADS_ENABLED=false
 * (or leave unset) when developing in Expo Go. With the flag on, UI shows a
 * labeled placeholder only — no real network ads until a native build.
 *
 * Next steps (see README → Ads):
 * 1. AdMob account + app IDs
 * 2. `npx expo install react-native-google-mobile-ads expo-dev-client`
 * 3. Configure app.json plugin + root `react-native-google-mobile-ads` keys
 * 4. EAS development build (`npm run build:dev`)
 * 5. Wire BannerAd from the package inside AdBanner when `isNativeAdsAvailable()`
 *
 * UX placement guidance (do not put ads on the swipe card stack):
 * - Good: home footer (between sessions), account screen, after match dismiss
 * - Optional later: rewarded interstitial for a perk
 * - Avoid: mid-swipe, lobby during join, create flow critical CTAs
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Google’s public test units — safe for development; replace in production. */
export const TEST_AD_UNIT_IDS = {
  app: {
    ios: 'ca-app-pub-3940256099942544~1458002511',
    android: 'ca-app-pub-3940256099942544~3347511713',
  },
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
  rewarded: {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  },
} as const;

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'TRUE';
}

function envOr(name: string, fallback: string): string {
  const v = process.env[name]?.trim();
  return v || fallback;
}

export const adsConfig = {
  /** Master kill-switch. Off by default so Expo Go / local work stays clean. */
  enabled: envFlag('EXPO_PUBLIC_ADS_ENABLED'),
  /** When true (default), use Google test unit IDs even if production IDs are set. */
  useTestIds: !envFlag('EXPO_PUBLIC_ADS_USE_PRODUCTION_IDS'),
  androidAppId: envOr(
    'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
    TEST_AD_UNIT_IDS.app.android,
  ),
  iosAppId: envOr('EXPO_PUBLIC_ADMOB_IOS_APP_ID', TEST_AD_UNIT_IDS.app.ios),
  androidBannerUnitId: envOr(
    'EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID',
    TEST_AD_UNIT_IDS.banner.android,
  ),
  iosBannerUnitId: envOr(
    'EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID',
    TEST_AD_UNIT_IDS.banner.ios,
  ),
};

export type AdPlacement =
  | 'home_footer'
  | 'account_footer'
  | 'after_match_dismiss';

/** Running inside Expo Go (no custom native modules). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * True only after installing `react-native-google-mobile-ads`, rebuilding a
 * native client, and setting EXPO_PUBLIC_ADS_NATIVE_LINKED=true.
 * Avoids a static `require()` that would break Metro while the package is absent.
 */
export function isNativeAdsAvailable(): boolean {
  if (isExpoGo()) return false;
  return envFlag('EXPO_PUBLIC_ADS_NATIVE_LINKED');
}

export function getBannerUnitId(): string {
  const ios = adsConfig.useTestIds
    ? TEST_AD_UNIT_IDS.banner.ios
    : adsConfig.iosBannerUnitId;
  const android = adsConfig.useTestIds
    ? TEST_AD_UNIT_IDS.banner.android
    : adsConfig.androidBannerUnitId;
  return Platform.OS === 'ios' ? ios : android;
}

/** Whether any ad UI (placeholder or real) should render for a placement. */
export function shouldShowAds(_placement: AdPlacement): boolean {
  return adsConfig.enabled;
}

/**
 * Call once at app launch. No-op until the native SDK is installed and linked.
 * Safe to call from Expo Go.
 */
export async function initializeAds(): Promise<void> {
  if (!adsConfig.enabled) return;
  if (!isNativeAdsAvailable()) {
    if (__DEV__) {
      console.info(
        '[ads] Enabled, but native SDK unavailable (Expo Go or package not linked). Showing placeholders only.',
      );
    }
    return;
  }

  // After `npx expo install react-native-google-mobile-ads` + rebuild:
  //   import mobileAds from 'react-native-google-mobile-ads';
  //   await mobileAds().initialize();
  if (__DEV__) {
    console.info(
      '[ads] Native linked flag is on — call mobileAds().initialize() here after installing the package.',
    );
  }
}
