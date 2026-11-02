import { getLocales, useLocales } from 'expo-localization';
import { useCallback, useMemo } from 'react';

import { today, weekdayOf } from '@/domain/dates';
import { formatMoney, formatSignedMoney } from '@/domain/money';
import { relativeDay } from '@/domain/transactions';
import type { Category, LocalDate, MonthKey } from '@/domain/types';
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

/** Same resolution as useLanguage, for code outside React (e.g. naming the first wallet). */
export function currentLanguage(): Language {
  const preference = useSettings.getState().language;
  if (preference !== 'system') return preference;
  return getLocales()[0]?.languageCode === 'vi' ? 'vi' : 'en';
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
  const fmt = useMemo(() => formatters(language), [language]);
  return { t, language, categoryName, ...fmt };
}

/** Language-aware formatting for money and calendar dates. */
function formatters(language: Language) {
  const tr = (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params);
  return {
    money: (amount: number) => formatMoney(amount, language),
    signedMoney: (amount: number) => formatSignedMoney(amount, language),
    /** "24 Tháng 10" / "10/24". */
    dayMonth: (date: LocalDate) => tr('date.dayMonth', { day: Number(date.slice(8, 10)), month: Number(date.slice(5, 7)) }),
    /** "Tháng 10/2026". */
    month: (month: MonthKey) => tr('date.month', { month: Number(month.slice(5, 7)), year: month.slice(0, 4) }),
    weekday: (date: LocalDate) => tr(`weekday.${weekdayOf(date)}` as TranslationKey),
    weekdayShort: (date: LocalDate) => tr(`weekdayShort.${weekdayOf(date)}` as TranslationKey),
    /** "Hôm nay", "Hôm qua", or the day and month. */
    relativeDate: (date: LocalDate, todayDate: LocalDate = today()) => {
      const rel = relativeDay(date, todayDate);
      if (rel === 'today') return tr('date.today');
      if (rel === 'yesterday') return tr('date.yesterday');
      return tr('date.dayMonth', { day: Number(date.slice(8, 10)), month: Number(date.slice(5, 7)) });
    },
  };
}