import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALES, STORIES, detectLocale } from '../content';
import type { Locale } from '../content';
import type { Story } from '../content/schema';

const STORAGE_KEY = 'clip-shield-defense:locale';

type LanguageValue = {
  locale: Locale;
  story: Story;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageValue | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (LOCALES as readonly string[]).includes(stored ?? '') ? (stored as Locale) : null;
  } catch {
    // Private browsing and blocked site data both throw here; the default is fine.
    return null;
  }
}

/**
 * Serves the script for the current language. The player can switch at any
 * point; the game state holds ids, not text, so a run carries on unchanged in
 * the other language. The choice is remembered, otherwise the browser decides.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof navigator === 'undefined'
      ? DEFAULT_LOCALE
      : (readStoredLocale() ?? detectLocale(navigator.languages ?? [navigator.language])),
  );

  // Screen readers and hyphenation depend on the document language being right.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Remembering the choice is a convenience, not a requirement.
    }
  }, []);

  const value = useMemo<LanguageValue>(() => ({ locale, story: STORIES[locale], setLocale }), [locale, setLocale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside a LanguageProvider');
  return value;
}
