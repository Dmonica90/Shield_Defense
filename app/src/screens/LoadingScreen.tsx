import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button, Scene } from '../components/ui';
import { useLanguage } from '../i18n/LanguageProvider';
import { TIMING } from '../timing';

/** The Clip shield mark, drawn in SVG so the first screen needs no image. */
export function ShieldMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden="true">
      <path d="M60 6 110 24v44c0 32-22 56-50 66C32 124 10 100 10 68V24Z" fill="none" stroke="var(--color-clip)" strokeWidth="6" />
      <path d="M60 22 96 35v33c0 23-15 41-36 49-21-8-36-26-36-49V35Z" fill="var(--color-clip)" opacity="0.18" />
      <path d="M40 70l14 14 28-30" fill="none" stroke="var(--color-accent)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The first screen: logo, a short loading bar, then Start. If there is a saved
 * run it offers to pick it up instead of starting over.
 */
export function LoadingScreen({
  hasSave,
  onStart,
  onResume,
}: {
  hasSave: boolean;
  onStart: () => void;
  onResume: () => void;
}) {
  const { story } = useLanguage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), TIMING.loading);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Scene className="scanlines">
      <div className="m-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <ShieldMark className="h-32 w-28 drop-shadow-[0_0_30px_rgba(255,106,19,0.35)]" />
        </motion.div>

        <div>
          <p className="font-mono text-sm tracking-[0.3em] text-clip uppercase">{story.meta.brand}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">{story.meta.title}</h1>
          <p className="mt-3 text-lg text-ink-dim">{story.meta.tagline}</p>
        </div>

        {!ready ? (
          <div className="w-full max-w-sm" role="status">
            <p className="mb-2 font-mono text-xs text-ink-dim">{story.loading.loadingLabel}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-clip"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: TIMING.loading / 1000, ease: 'easeInOut' }}
              />
            </div>
          </div>
        ) : hasSave ? (
          <div className="panel w-full rounded-2xl p-6 text-left">
            <h2 className="text-lg font-semibold">{story.loading.resumeTitle}</h2>
            <p className="mt-2 text-ink-dim">{story.loading.resumeBody}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button tone="ghost" onClick={onStart}>
                {story.loading.restart}
              </Button>
              <Button onClick={onResume} sfx="confirm">
                {story.loading.resume}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onStart} sfx="confirm" className="px-10 text-lg">
            {story.loading.start}
          </Button>
        )}
      </div>
    </Scene>
  );
}
