import { useLocales } from 'expo-localization';
import { useCallback } from 'react';

import type { Category } from '@/domain/types';
import { useSettings } from '@/state/settings';

import { en } from './en';
import { vi } from './vi';

export type Language = 'vi' | 'en';

// Recursive type to extract all nested translation keys
type TranslationKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${TranslationKeys<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = TranslationKeys<typeof vi>;

const dictionaries: Record<Language, Record<string, string>> = { vi, en };

export function translate(language: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  const value = dictionaries[language][key];
  if (typeof value !== 'string') return key;
  return params ? value.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : value;
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