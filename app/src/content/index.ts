import en from './story.en.json';
import es from './story.es.json';
import type { Story } from './schema';

/**
 * One script per language. Every file has the same shape, and the tests hold
 * the translations to the Spanish original: same hotspot ids, same right
 * answers, same placeholders, so tracking never depends on the language.
 */
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const STORIES: Record<Locale, Story> = {
  es: es as Story,
  en: en as Story,
};

export const DEFAULT_LOCALE: Locale = 'es';

/** Picks a supported locale from the browser's preferences. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return DEFAULT_LOCALE;
}
