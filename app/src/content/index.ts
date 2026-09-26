import es from './story.es.json';
import type { Story } from './schema';

/**
 * One script per language. Spanish is the only one today; adding English is a
 * `story.en.json` with the same shape plus an entry here — the tests hold every
 * file to the same structure.
 */
export const LOCALES = ['es'] as const;
export type Locale = (typeof LOCALES)[number];

export const STORIES: Record<Locale, Story> = {
  es: es as Story,
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
