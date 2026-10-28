import { LOCALES, STORIES } from '../content';
import { useLanguage } from '../i18n/LanguageProvider';
import { useSound } from '../audio/SoundProvider';

/**
 * ES | EN, available on every screen. Switching only swaps the script: the run
 * keeps its state, so a player can change language in the middle of an area.
 */
export function LanguageSwitch({ size = 'sm', className = '' }: { size?: 'sm' | 'lg'; className?: string }) {
  const { locale, setLocale, story } = useLanguage();
  const { play } = useSound();
  const pad = size === 'lg' ? 'min-h-11 px-5 text-sm' : 'min-h-9 px-3 text-xs';

  return (
    <div
      role="group"
      aria-label={story.languageLabel}
      className={`no-print inline-flex rounded-xl border border-edge bg-panel-2/80 p-1 font-mono tracking-[0.12em] ${className}`}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={locale === code}
          aria-label={STORIES[code].languageName}
          title={STORIES[code].languageName}
          onClick={() => {
            if (code === locale) return;
            play('click');
            setLocale(code);
          }}
          className={`rounded-lg uppercase transition-colors duration-150 ${pad} ${
            locale === code ? 'bg-accent font-semibold text-ground' : 'text-ink-dim hover:text-ink'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
