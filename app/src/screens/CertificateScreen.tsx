import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Fragment } from '../components/Fragment';
import { Button, Scene } from '../components/ui';
import { fill } from '../content/schema';
import { score } from '../game/machine';
import { AREA_IDS } from '../game/types';
import type { GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';
import { ShieldMark } from './LoadingScreen';

const pad = (n: number) => String(n).padStart(2, '0');

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)} min`;
}

/**
 * The certificate. The name comes from the LMS once SCORM is connected; until
 * then the learner types it. "Download PDF" is the browser's print dialog with
 * a dedicated print sheet, so it needs no PDF library.
 */
export function CertificateScreen({
  state,
  learnerName,
  onFinish,
  onClose,
}: {
  state: GameState;
  learnerName: string | null;
  onFinish: () => void;
  onClose: () => void;
}) {
  const { story, locale } = useLanguage();
  const c = story.certificate;
  const [name, setName] = useState(learnerName ?? '');
  const [issued, setIssued] = useState(learnerName != null);

  // Completion is recorded the moment the certificate is earned.
  useEffect(() => {
    onFinish();
  }, [onFinish]);

  const finished = new Date(state.finishedAt ?? Date.now());
  const duration = (state.finishedAt ?? Date.now()) - (state.startedAt ?? Date.now());

  if (!issued) {
    return (
      <Scene>
        <form
          className="panel m-auto flex w-full max-w-md flex-col gap-4 rounded-2xl p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setIssued(true);
          }}
        >
          <label htmlFor="learner-name" className="text-lg font-semibold">
            {c.namePrompt}
          </label>
          <input
            id="learner-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={c.namePlaceholder}
            maxLength={80}
            autoComplete="name"
            className="rounded-xl border border-edge bg-ground/70 px-4 py-3 text-ink focus:border-accent focus:outline-none"
          />
          <Button type="submit" onClick={undefined} sfx="confirm">
            {c.nameConfirm}
          </Button>
        </form>
      </Scene>
    );
  }

  return (
    <Scene>
      <div className="m-auto flex w-full max-w-3xl flex-col gap-5 py-4">
        <motion.article
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="print-area relative rounded-3xl border-4 border-double border-clip/70 bg-panel p-6 text-center sm:p-10"
          aria-labelledby="cert-title"
        >
          <ShieldMark className="mx-auto h-16 w-14" />
          <p className="mt-3 font-mono text-xs tracking-[0.35em] text-ink-dim uppercase">{c.label}</p>
          <h1 id="cert-title" className="mt-4 text-3xl font-bold sm:text-4xl">
            {name.trim() || c.fallbackName}
          </h1>
          <p className="mt-3 text-ink-dim">{c.completed}</p>
          <p className="mt-2 text-2xl font-bold text-clip">
            {story.meta.brand.toUpperCase()} {story.meta.title.toUpperCase()}
          </p>
          <p className="text-ink-dim">{story.meta.tagline}</p>

          <dl className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-x-6 gap-y-2 text-left text-sm">
            <dt className="text-ink-dim">{c.date}</dt>
            <dd>{finished.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
            <dt className="text-ink-dim">{c.time}</dt>
            <dd>{`${pad(finished.getHours())}:${pad(finished.getMinutes())}`}</dd>
            <dt className="text-ink-dim">{c.duration}</dt>
            <dd>{formatDuration(duration)}</dd>
            <dt className="text-ink-dim">{c.status}</dt>
            <dd>{c.statusValue}</dd>
            <dt className="text-ink-dim">{c.score}</dt>
            <dd>{fill(c.scoreValue, { score: score(state) })}</dd>
          </dl>

          <p className="mt-6 font-semibold">{c.fragments}</p>
          <div className="mt-3 flex justify-center gap-5">
            {AREA_IDS.map((area) => (
              <Fragment key={area} area={area} look="genuine" />
            ))}
          </div>

          <p className="mt-6">
            🎖️ {c.badgeLabel}: <strong>«{c.badge}»</strong>
          </p>
          <p className="mt-1 text-sm text-ink-dim">{c.credit}</p>
        </motion.article>

        <div className="no-print flex flex-wrap justify-end gap-3">
          <Button tone="ghost" onClick={() => window.print()}>
            ⬇️ {c.download}
          </Button>
          <Button onClick={onClose}>✅ {c.close}</Button>
        </div>
      </div>
    </Scene>
  );
}
