import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LOCALE, STORIES, detectLocale } from '../content';
import type { Locale } from '../content';
import type { Story } from '../content/schema';

type LanguageValue = {
  locale: Locale;
  story: Story;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Serves the script for the current language. With Spanish as the only locale
 * there is no switcher in the UI, but screens read their copy through here so a
 * second language needs no changes to them.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    typeof navigator === 'undefined'
      ? DEFAULT_LOCALE
      : detectLocale(navigator.languages ?? [navigator.language]),
  );

  // Screen readers and hyphenation depend on the document language being right.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageValue>(() => ({ locale, story: STORIES[locale], setLocale }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside a LanguageProvider');
  return value;
}
