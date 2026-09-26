import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button, Scene } from '../components/ui';
import { fill } from '../content/schema';
import { REFLECTION_LIMITS, reflectionValid } from '../game/machine';
import type { GameAction, GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * Two questions. The first is an open reflection that is never graded (50–500
 * characters, or skip it). The second is true/false on the DLP; "true" gets the
 * explanation and another try, since "false" is needed for the certificate.
 */
export function EvaluationScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (action: GameAction) => void;
}) {
  const { story } = useLanguage();
  const ev = story.evaluation;
  const [text, setText] = useState('');
  const length = text.trim().length;
  const valid = reflectionValid(text);
  const onQ2 = state.evaluation.reflection !== null;

  return (
    <Scene>
      <div className="m-auto flex w-full max-w-2xl flex-col gap-6">
        <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
          {ev.label} · {onQ2 ? 2 : 1} / 2
        </p>

        <AnimatePresence mode="wait">
          {!onQ2 ? (
            <motion.section key="q1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="panel rounded-2xl p-6">
              <label htmlFor="reflection" className="text-xl font-semibold">
                {ev.q1}
              </label>
              <p className="mt-2 text-sm text-ink-dim">{ev.q1Note}</p>
              <textarea
                id="reflection"
                value={text}
                maxLength={REFLECTION_LIMITS.max}
                onChange={(e) => setText(e.target.value)}
                placeholder={ev.q1Placeholder}
                rows={5}
                aria-describedby="reflection-count"
                className="mt-4 w-full rounded-xl border border-edge bg-ground/70 p-4 text-ink placeholder:text-ink-dim/60 focus:border-accent focus:outline-none"
              />
              <p id="reflection-count" className={`mt-2 font-mono text-xs ${valid ? 'text-safe' : 'text-ink-dim'}`}>
                {fill(ev.q1Counter, { count: length, max: REFLECTION_LIMITS.max })}
                {!valid && length > 0 && length < REFLECTION_LIMITS.min && (
                  <> · {fill(ev.q1TooShort, { missing: REFLECTION_LIMITS.min - length })}</>
                )}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <Button tone="quiet" onClick={() => dispatch({ type: 'skipReflection' })}>
                  {ev.skip}
                </Button>
                <Button disabled={!valid} onClick={() => dispatch({ type: 'submitReflection', text })}>
                  {ev.submit}
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.section key="q2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel rounded-2xl p-6">
              <h1 className="text-2xl font-semibold">{ev.q2}</h1>
              <p className="mt-2 text-sm text-ink-dim">{ev.q2Note}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button tone="ghost" onClick={() => dispatch({ type: 'answerDlp', answer: true })} className="py-4 text-lg">
                  {ev.trueLabel}
                </Button>
                <Button tone="ghost" sfx="confirm" onClick={() => dispatch({ type: 'answerDlp', answer: false })} className="py-4 text-lg">
                  {ev.falseLabel}
                </Button>
              </div>
              <div aria-live="assertive">
                {state.evaluation.dlpAnswer === true && (
                  <p className="mt-5 rounded-xl border border-warn/60 bg-warn/10 p-4 text-warn">{ev.wrong}</p>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Scene>
  );
}
