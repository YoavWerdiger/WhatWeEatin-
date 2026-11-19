import type { AppLocale } from '../localeStore';
import { en, type MessageKey, type Messages } from './en';
import { he } from './he';
import { es } from './es';
import { fr } from './fr';
import { ar } from './ar';

export const translations: Record<AppLocale, Messages> = {
  en,
  he,
  es,
  fr,
  ar,
};

export type { MessageKey, Messages };
