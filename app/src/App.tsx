import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageSwitch } from './components/LanguageSwitch';
import { SessionGuard } from './components/SessionGuard';
import { DEFAULT_LOCALE, STORIES } from './content';
import { initialState } from './game/machine';
import type { GameState } from './game/types';
import { useLanguage } from './i18n/LanguageProvider';
import { AreaScreen } from './screens/AreaScreen';
import { AreaSelectScreen } from './screens/AreaSelectScreen';
import { CertificateScreen } from './screens/CertificateScreen';
import { ConsoleScreen } from './screens/ConsoleScreen';
import { DebriefScreen } from './screens/DebriefScreen';
import { EndedScreen } from './screens/EndedScreen';
import { EvaluationScreen } from './screens/EvaluationScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { IntroScreen } from './screens/IntroScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { RoundEndScreen } from './screens/RoundEndScreen';
import { RulesScreen } from './screens/RulesScreen';
import { clearProgress, loadProgress } from './tracking/progress';
import { createConsoleReporter, silentReporter } from './tracking/reporter';
import type { Reporter } from './tracking/reporter';
import { createScormReporter, scormDriver } from './tracking/scorm';
import { useTrackedReducer } from './tracking/useTrackedReducer';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Screens that place the language switch themselves (the first screen and the HUD); the rest float it. */
const OWN_SWITCH = new Set<GameState['phase']>(['loading', 'areaSelect', 'area', 'roundEnd']);

/**
 * The whole course is one reducer plus a switch over `phase`. Adding a screen
 * means adding a phase and a case, not rewiring navigation. Tracking goes
 * through the reporter: SCORM 2004 when the course runs inside an LMS that
 * loaded the driver (the packaged build), the console in development, and
 * nothing on the public site.
 */
export function App() {
  const { story } = useLanguage();
  const reporter = useMemo<Reporter>(() => {
    const driver = scormDriver();
    if (driver) {
      // Workday's reports read the same whatever language each learner picked.
      const scorm = createScormReporter(driver, STORIES[DEFAULT_LOCALE]);
      // Started here, before anything reads the LMS: the resume offer below needs it.
      scorm.start();
      return scorm;
    }
    return import.meta.env.DEV ? createConsoleReporter() : silentReporter;
  }, []); // The reporter must not be recreated, or the LMS session would restart.
  // Inside an LMS the saved run is the LMS's; the browser's storage may be blocked in its frame.
  const saved = useMemo(() => (reporter.inLms ? reporter.savedProgress() : loadProgress()), [reporter]);
  const [state, dispatch] = useTrackedReducer(initialState, reporter);
  const [ended, setEnded] = useState<string | null>(null);

  useEffect(() => {
    reporter.start();
    if (!reporter.inLms) return;
    // Closing the LMS window or the mobile app's viewer. iOS does not fire
    // `beforeunload` reliably, so `pagehide` is the one that counts there.
    const leave = () => reporter.finish();
    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
    };
  }, [reporter]);

  const exit = useCallback(
    (message: string) => {
      reporter.finish();
      setEnded(message);
    },
    [reporter],
  );

  const finish = useCallback(() => dispatch({ type: 'finish', now: Date.now() }), [dispatch]);

  if (ended) return <EndedScreen message={ended} />;

  const screen = () => {
    switch (state.phase) {
      case 'loading':
        return (
          <LoadingScreen
            key="loading"
            hasSave={saved != null}
            onStart={() => {
              clearProgress();
              dispatch({ type: 'loaded', now: Date.now(), seed: newSeed() });
            }}
            onResume={() => saved && dispatch({ type: 'resume', state: saved })}
          />
        );

      case 'intro':
        return (
          <IntroScreen
            key="intro"
            onDone={() => dispatch({ type: 'introDone' })}
            onExit={() => exit(story.gameOver.exited)}
          />
        );

      case 'rules':
        return <RulesScreen key="rules" onDone={(skipped) => dispatch({ type: 'rulesDone', skipped })} />;

      case 'areaSelect':
        return (
          <AreaSelectScreen
            key={`select-${state.round}`}
            state={state}
            onOpen={(area) => dispatch({ type: 'openArea', area, now: Date.now() })}
          />
        );

      case 'area':
        return state.currentArea ? (
          <AreaScreen key={`area-${state.currentArea}-${state.round}`} state={state} area={state.currentArea} dispatch={dispatch} />
        ) : null;

      case 'console':
        return <ConsoleScreen key={`console-${state.round}`} state={state} onDone={() => dispatch({ type: 'consoleDone' })} />;

      case 'roundEnd':
        return <RoundEndScreen key={`round-end-${state.round}`} state={state} onNext={() => dispatch({ type: 'nextRound' })} />;

      case 'debrief':
        return <DebriefScreen key="debrief" onDone={() => dispatch({ type: 'debriefDone' })} />;

      case 'evaluation':
        return <EvaluationScreen key="evaluation" state={state} dispatch={dispatch} />;

      case 'certificate':
        return (
          <CertificateScreen
            key="certificate"
            state={state}
            learnerName={reporter.learnerName()}
            onFinish={finish}
            onClose={() => {
              clearProgress();
              exit(story.certificate.closed);
            }}
          />
        );

      case 'gameOver':
        return (
          <GameOverScreen
            key="game-over"
            state={state}
            onRetry={() => dispatch({ type: 'restart', now: Date.now(), seed: newSeed() })}
            onExit={() => {
              clearProgress();
              exit(story.gameOver.exited);
            }}
          />
        );
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">{screen()}</AnimatePresence>
      {!OWN_SWITCH.has(state.phase) && <LanguageSwitch className="fixed top-3 right-3 z-40" />}
      <SessionGuard phase={state.phase} onExit={() => exit(story.session.exited)} warnOnLeave={!reporter.inLms} />
    </>
  );
}
