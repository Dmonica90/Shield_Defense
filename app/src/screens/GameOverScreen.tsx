import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useSound } from '../audio/SoundProvider';
import { Button, Scene } from '../components/ui';
import { fill } from '../content/schema';
import { securedCount } from '../game/machine';
import { MAX_FAILURES } from '../game/types';
import type { GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';

/** Three failed verifications: the attack gets in. Retry starts over from zero. */
export function GameOverScreen({
  state,
  onRetry,
  onExit,
}: {
  state: GameState;
  onRetry: () => void;
  onExit: () => void;
}) {
  const { story } = useLanguage();
  const { play } = useSound();
  const g = story.gameOver;

  useEffect(() => {
    play('lose');
  }, [play]);

  return (
    <Scene className="glitch-heavy glitch-still">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="m-auto w-full max-w-lg rounded-2xl border-2 border-alarm/70 bg-ground/90 p-8 text-center font-mono"
        role="alert"
      >
        <p className="text-xs tracking-[0.3em] text-alarm uppercase">{g.label}</p>
        <h1 className="mt-3 text-3xl font-bold text-alarm">{g.title}</h1>
        <p className="mt-4 font-display text-ink-dim">{g.body}</p>
        <ul className="mt-6 flex flex-col gap-1 text-sm">
          <li>{fill(g.failures, { failures: state.failures, max: MAX_FAILURES })}</li>
          <li>{fill(g.fragments, { count: securedCount(state) })}</li>
          <li>{fill(g.wrong, { count: state.decisions.filter((d) => !d.correct).length })}</li>
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button tone="ghost" onClick={onExit}>
            {g.exit}
          </Button>
          <Button tone="danger" onClick={onRetry}>
            {g.retry}
          </Button>
        </div>
      </motion.div>
    </Scene>
  );
}
