import { en, Translations } from './en.ts';
import { ar } from './ar.ts';
import { AppLanguage } from '../types/index.ts';

export type { Translations };

export function getTranslations(lang: AppLanguage): Translations {
  if (lang === 'ar') return ar;
  return en;
}

export function setDocumentDirection(lang: AppLanguage): void {
  if (typeof document === 'undefined') return;
  const isRTL = lang === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  if (isRTL) {
    document.documentElement.classList.add('rtl');
  } else {
    document.documentElement.classList.remove('rtl');
  }
}
