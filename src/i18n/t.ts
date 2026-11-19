import { useCallback, useMemo } from 'react';
import { LOCALE_META, useLocaleStore } from './localeStore';
import { translations, type MessageKey } from './messages';

function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

/** Use outside React (e.g. Zustand) — reads current locale from store. */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const locale = useLocaleStore.getState().locale;
  const pack = translations[locale] ?? translations.en;
  const fallback = translations.en[key] ?? String(key);
  const raw = pack[key] ?? fallback;
  return interpolate(raw, params);
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const translate = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      const pack = translations[locale] ?? translations.en;
      const fallback = translations.en[key] ?? String(key);
      const raw = pack[key] ?? fallback;
      return interpolate(raw, params);
    },
    [locale],
  );

  const isRTL = useMemo(() => LOCALE_META[locale].isRTL, [locale]);

  return { t: translate, locale, setLocale, isRTL };
}
