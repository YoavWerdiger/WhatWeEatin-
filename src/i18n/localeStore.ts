import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { DevSettings, I18nManager, Platform } from 'react-native';

export const SUPPORTED_LOCALES = ['en', 'he', 'es', 'fr', 'ar'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_META: Record<
  AppLocale,
  { nativeName: string; isRTL: boolean }
> = {
  en: { nativeName: 'English', isRTL: false },
  he: { nativeName: 'עברית', isRTL: true },
  es: { nativeName: 'Español', isRTL: false },
  fr: { nativeName: 'Français', isRTL: false },
  ar: { nativeName: 'العربية', isRTL: true },
};

function inferLocaleFromDevice(): AppLocale {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase() ?? 'en';
  if (code === 'he' || code === 'iw') return 'he';
  if (code === 'es') return 'es';
  if (code === 'fr') return 'fr';
  if (code === 'ar') return 'ar';
  return 'en';
}

export function applyRtlForLocale(locale: AppLocale) {
  const rtl = LOCALE_META[locale].isRTL;
  if (Platform.OS === 'web') return;
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
}

interface LocaleState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: inferLocaleFromDevice(),
      setLocale: (locale) => {
        const prevRtl = LOCALE_META[get().locale].isRTL;
        const nextRtl = LOCALE_META[locale].isRTL;
        set({ locale });
        applyRtlForLocale(locale);
        if (prevRtl !== nextRtl && Platform.OS !== 'web' && __DEV__) {
          DevSettings?.reload?.();
        }
      },
    }),
    {
      name: 'whatweeatin-locale',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ locale: s.locale }),
    },
  ),
);
