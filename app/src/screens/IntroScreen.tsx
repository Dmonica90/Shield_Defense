import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { INTRO_VIDEO } from '../assets';
import { Button, Dialog, Scene, Typewriter } from '../components/ui';
import { AREA_IDS } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';
import { TIMING } from '../timing';

type Mode = 'probing' | 'video' | 'narration';

/**
 * The opening. The design calls for a 90-second video; until it exists this
 * plays the same script as an animated narration. The video is tried first and
 * the narration takes over if the file is missing, and if it starts but stalls
 * the player gets the retry / skip / exit dialog from the design.
 */
export function IntroScreen({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const { story } = useLanguage();
  const [mode, setMode] = useState<Mode>('probing');
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Is there a video at all? A HEAD request answers without downloading it.
  useEffect(() => {
    let alive = true;
    fetch(INTRO_VIDEO, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        if (alive) setMode(res.ok && type.startsWith('video') ? 'video' : 'narration');
      })
      .catch(() => alive && setMode('narration'));
    return () => {
      alive = false;
    };
  }, []);

  // The video exists but has not started playing in time.
  useEffect(() => {
    if (mode !== 'video') return;
    const id = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 3) setStalled(true);
    }, TIMING.videoTimeout);
    return () => window.clearTimeout(id);
  }, [mode, attempt]);

  if (mode === 'probing') return <Scene>{null}</Scene>;

  return (
    <Scene className="scanlines">
      {mode === 'video' ? (
        <div className="m-auto flex w-full max-w-4xl flex-col gap-4">
          <video
            key={attempt}
            ref={videoRef}
            src={INTRO_VIDEO}
            autoPlay
            playsInline
            controls
            onEnded={onDone}
            onError={() => setStalled(true)}
            className="w-full rounded-2xl border border-edge"
          />
          <div className="flex justify-end">
            <Button tone="quiet" onClick={onDone}>
              {story.intro.skip}
            </Button>
          </div>
        </div>
      ) : (
        <Narration onDone={onDone} />
      )}

      <Dialog open={stalled} labelledBy="video-error">
        <h2 id="video-error" className="text-xl font-semibold">
          ⚠️ {story.intro.videoErrorTitle}
        </h2>
        <p className="mt-3 text-ink-dim">{story.intro.videoErrorBody}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button tone="quiet" onClick={onExit}>
            {story.intro.videoExit}
          </Button>
          <Button tone="ghost" onClick={() => { setStalled(false); onDone(); }}>
            {story.intro.videoSkip}
          </Button>
          <Button onClick={() => { setStalled(false); setAttempt((n) => n + 1); }}>
            {story.intro.videoRetry}
          </Button>
        </div>
      </Dialog>
    </Scene>
  );
}

/** The narrator's lines one at a time, then the four situations to come. */
function Narration({ onDone }: { onDone: () => void }) {
  const { story } = useLanguage();
  const lines = story.intro.lines;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const showScenes = index >= lines.length;

  const advance = () => {
    setTyped(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="m-auto flex w-full max-w-3xl flex-col gap-8">
      <p className="font-mono text-xs tracking-[0.3em] text-clip uppercase">● {story.intro.label}</p>

      <AnimatePresence mode="wait">
        {!showScenes ? (
          <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Typewriter
              text={lines[index]}
              speed={28}
              onDone={() => setTyped(true)}
              className="min-h-[6rem] text-2xl leading-snug font-semibold sm:text-4xl"
            />
          </motion.div>
        ) : (
          <motion.ul key="scenes" className="grid gap-3 sm:grid-cols-2" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.15 } } }}>
            {AREA_IDS.map((area) => (
              <motion.li
                key={area}
                variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0 } }}
                className="panel flex items-center gap-3 rounded-xl p-4"
              >
                <span aria-hidden="true" className="text-2xl">{story.areas[area].fragment.icon}</span>
                <span>{story.intro.scenes[area]}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button tone="quiet" onClick={onDone}>
          {story.intro.skip}
        </Button>
        {showScenes ? (
          <Button onClick={onDone} sfx="confirm">
            {story.intro.continue}
          </Button>
        ) : (
          <Button onClick={advance} disabled={!typed}>
            {story.intro.continue}
          </Button>
        )}
      </div>
    </div>
  );
}
