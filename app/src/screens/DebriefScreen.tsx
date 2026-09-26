import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button, Scene } from '../components/ui';
import { useLanguage } from '../i18n/LanguageProvider';
import { TIMING } from '../timing';

/**
 * Six cards, one at a time. Each advances on its own after five seconds, or
 * sooner with Next; there is no way to skip the whole debrief.
 */
export function DebriefScreen({ onDone }: { onDone: () => void }) {
  const { story } = useLanguage();
  const cards = story.debrief.cards;
  const [index, setIndex] = useState(0);
  const last = index === cards.length - 1;

  useEffect(() => {
    if (last) return;
    const id = window.setTimeout(() => setIndex((i) => i + 1), TIMING.debriefCard);
    return () => window.clearTimeout(id);
  }, [index, last]);

  const card = cards[index];

  return (
    <Scene>
      <div className="m-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">{story.debrief.label}</p>
          <p className="font-mono text-xs text-ink-dim" aria-hidden="true">
            {index + 1} / {cards.length}
          </p>
        </div>

        <div className="flex gap-1.5" aria-hidden="true">
          {cards.map((c, i) => (
            <span key={c.title} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-panel-2'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.article
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
            className="panel min-h-72 rounded-2xl p-8"
            aria-live="polite"
          >
            <h1 className="text-2xl font-bold text-clip">{card.title}</h1>
            <div className="mt-5 flex flex-col gap-3 text-lg leading-relaxed">
              {card.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {card.source && <p className="mt-5 font-mono text-sm text-ink-dim">— {card.source}</p>}
          </motion.article>
        </AnimatePresence>

        <div className="flex justify-end">
          {last ? (
            <Button onClick={onDone} sfx="confirm">
              {story.debrief.finish}
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)}>{story.debrief.next}</Button>
          )}
        </div>
      </div>
    </Scene>
  );
}
