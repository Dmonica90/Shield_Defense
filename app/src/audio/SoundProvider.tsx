import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SFX } from '../assets';
import type { SfxName } from '../assets';

const STORAGE_KEY = 'clip-shield-defense:muted';

type SoundValue = {
  muted: boolean;
  toggleMuted: () => void;
  play: (name: SfxName) => void;
};

const SoundContext = createContext<SoundValue | null>(null);

/**
 * Thin wrapper over a pool of preloaded <audio> elements. The course uses nine
 * short effects and no narration, so nothing here needs to be localized — only
 * muted.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const pool = useRef<Partial<Record<SfxName, HTMLAudioElement>>>({});

  useEffect(() => {
    for (const [name, src] of Object.entries(SFX) as [SfxName, string][]) {
      const el = new Audio(src);
      el.preload = 'auto';
      pool.current[name] = el;
    }
    return () => {
      pool.current = {};
    };
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Preference only; playback still works without it.
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (name: SfxName) => {
      if (muted) return;
      const el = pool.current[name];
      if (!el) return;
      el.currentTime = 0;
      // Autoplay policies reject until the first gesture; that is not an error.
      void el.play().catch(() => undefined);
    },
    [muted],
  );

  const value = useMemo(() => ({ muted, toggleMuted, play }), [muted, toggleMuted, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundValue {
  const value = useContext(SoundContext);
  if (!value) throw new Error('useSound must be used inside a SoundProvider');
  return value;
}
