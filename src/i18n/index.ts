import { useLocales } from 'expo-localization';
import { useCallback } from 'react';

import type { Category } from '@/domain/types';
import { useSettings } from '@/state/settings';

import { en } from './en';
import { vi, type TranslationKey } from './vi';

export type Language = 'vi' | 'en';
export type { TranslationKey };

const dictionaries: Record<Language, Record<TranslationKey, string>> = { vi, en };

export function translate(language: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  const text: string = dictionaries[language][key];
  return params ? text.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : text;
}

/** Vietnamese devices get Vietnamese; everything else falls back to English. */
export function useLanguage(): Language {
  const preference = useSettings((s) => s.language);
  const locales = useLocales();
  if (preference !== 'system') return preference;
  return locales[0]?.languageCode === 'vi' ? 'vi' : 'en';
}

export function useT() {
  const language = useLanguage();
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );
  const categoryName = useCallback(
    (category: Category | undefined) => {
      if (!category) return translate(language, 'category.unknown');
      if (category.builtInKey) {
        const key = `category.${category.builtInKey}` as TranslationKey;
        if (key in vi) return translate(language, key);
      }
      return category.name ?? translate(language, 'category.unknown');
    },
    [language],
  );
  return { t, language, categoryName };
}
