import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSound } from '../audio/SoundProvider';
import { Fragment } from '../components/Fragment';
import { Button, Scene } from '../components/ui';
import { fill } from '../content/schema';
import { verification } from '../game/machine';
import { AREA_IDS } from '../game/types';
import type { GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';
import { TIMING } from '../timing';

/**
 * The Central Console: where the round's fragments are verified. It is the
 * first moment the player learns whether any of them were false. Not
 * skippable — Continue appears once the verification has run its course.
 */
export function ConsoleScreen({ state, onDone }: { state: GameState; onDone: () => void }) {
  const { story } = useLanguage();
  const { play } = useSound();
  const result = verification(state);
  const falseCount = AREA_IDS.filter((id) => result[id] === 'false').length;
  const win = falseCount === 0;
  const total = win ? TIMING.consoleWin : TIMING.consoleFail;

  // The run is split into beats: scan, one reveal per fragment, verdict.
  const beats = AREA_IDS.length + 2;
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= beats) return;
    const id = window.setTimeout(() => setBeat((b) => b + 1), total / beats);
    return () => window.clearTimeout(id);
  }, [beat, beats, total]);

  const revealed = Math.max(0, beat - 1);
  const done = beat >= beats;

  useEffect(() => {
    if (beat >= 2 && beat <= AREA_IDS.length + 1) {
      const area = AREA_IDS[beat - 2];
      play(result[area] === 'false' ? 'fired' : 'select');
    }
    if (beat === beats) play(win ? 'day' : 'alert');
    // Sounds follow the beat; the result is fixed for the life of this screen.
  }, [beat]);

  return (
    <Scene className="scanlines">
      <div className="m-auto w-full max-w-2xl">
        <div
          className={`rounded-2xl border-2 bg-ground/90 p-6 font-mono shadow-2xl sm:p-8 ${
            done ? (win ? 'border-safe/70' : 'border-alarm/70') : 'border-accent/50'
          }`}
        >
          <p className="text-xs text-ink-dim">{story.console.system}</p>
          <p className="mt-4 text-accent">{story.console.verifying}</p>

          <div
            className="mt-4 h-3 overflow-hidden rounded bg-panel-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((Math.min(beat, beats) / beats) * 100)}
          >
            <motion.div
              className={`h-full ${done && !win ? 'bg-alarm' : 'bg-safe'}`}
              initial={{ width: '0%' }}
              animate={{ width: `${(Math.min(beat, beats) / beats) * 100}%` }}
              transition={{ duration: total / beats / 1000, ease: 'linear' }}
            />
          </div>

          <ul className="mt-6 flex flex-col gap-3" aria-live="polite">
            {AREA_IDS.map((area, i) => {
              const shown = i < revealed;
              const genuine = result[area] === 'genuine';
              const content = story.areas[area];
              return (
                <li key={area} className="flex items-center gap-3">
                  <Fragment area={area} look={shown ? (genuine ? 'genuine' : 'false') : 'held'} size="sm" label={false} />
                  <span className="flex-1">
                    {content.fragment.name.toUpperCase()} ({content.fragment.icon})
                  </span>
                  {shown ? (
                    <span className={genuine ? 'text-safe' : 'text-alarm'}>
                      {genuine ? '✅' : '❌'} [{genuine ? story.console.genuine : story.console.false}]
                    </span>
                  ) : (
                    <span className="animate-pulse text-ink-dim">…</span>
                  )}
                </li>
              );
            })}
          </ul>

          {done && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8" role="status">
              <p className={`text-xl font-bold ${win ? 'text-safe' : 'text-alarm'}`}>
                {win ? story.console.successTitle : story.console.failTitle}
              </p>
              <p className="mt-1 text-ink-dim">
                {win ? story.console.successBody : fill(story.console.failBody, { count: falseCount })}
              </p>
              <div className="mt-6 flex justify-end">
                <Button onClick={onDone}>{story.console.continue}</Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </Scene>
  );
}
