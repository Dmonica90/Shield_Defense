import { useEffect, useState } from 'react';
import type { Phase } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';
import { TIMING } from '../timing';
import { Button, Dialog } from './ui';

/** Phases where leaving would cost the player something. */
const IN_PLAY = new Set<Phase>(['area', 'areaSelect', 'console', 'roundEnd', 'debrief', 'evaluation']);

/**
 * Two safety nets from the design. After 15 minutes without input the session
 * pauses (progress is already saved on every step); and closing or reloading
 * the tab mid-run asks for confirmation first — except inside an LMS, which
 * keeps the run itself and has its own close button the prompt would get in
 * the way of.
 */
export function SessionGuard({
  phase,
  onExit,
  warnOnLeave = true,
}: {
  phase: Phase;
  onExit: () => void;
  warnOnLeave?: boolean;
}) {
  const { story } = useLanguage();
  const [idle, setIdle] = useState(false);
  const inPlay = IN_PLAY.has(phase);

  useEffect(() => {
    if (!inPlay) return;
    let timer = window.setTimeout(() => setIdle(true), TIMING.idle);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), TIMING.idle);
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [inPlay]);

  useEffect(() => {
    // Inside an iframe (a Storyline web object) the host owns leaving the page.
    if (!inPlay || !warnOnLeave || window.self !== window.top) return;
    const warn = (event: BeforeUnloadEvent) => {
      // Browsers show their own wording; setting returnValue is what triggers it.
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inPlay, warnOnLeave]);

  return (
    <Dialog open={idle && inPlay} onClose={() => setIdle(false)} labelledBy="idle-title">
      <h2 id="idle-title" className="text-xl font-semibold">
        ⏱️ {story.session.idleTitle}
      </h2>
      <p className="mt-3 text-ink-dim">{story.session.idleBody}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          tone="ghost"
          onClick={() => {
            setIdle(false);
            onExit();
          }}
        >
          {story.session.exit}
        </Button>
        <Button onClick={() => setIdle(false)}>{story.session.resume}</Button>
      </div>
    </Dialog>
  );
}
