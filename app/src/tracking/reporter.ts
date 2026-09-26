import type { GameState } from '../game/types';
import type { TrackingEvent } from './events';

/**
 * Where grades and progress go. The game talks only to this interface; today
 * the implementation logs to the console, and the SCORM adapter for Workday
 * will be a second implementation with no change to the screens or the rules:
 *
 * - `start`        → `Initialize("")`, read `cmi.learner_name` / `cmi.suspend_data`
 * - `event`        → `cmi.interactions.n.*` / `cmi.objectives.n.*`
 * - `saveProgress` → `cmi.suspend_data`, `cmi.location`, `Commit("")`
 * - `complete`     → `cmi.score.*`, `cmi.completion_status`, `cmi.success_status`
 * - `finish`       → `cmi.session_time`, `cmi.exit`, `Terminate("")`
 */
export type Reporter = {
  start(): void;
  /** The learner's name, when the host (an LMS) knows it. */
  learnerName(): string | null;
  event(event: TrackingEvent): void;
  saveProgress(state: GameState): void;
  complete(result: { score: number; passed: boolean; seconds: number }): void;
  finish(): void;
};

/** Logs every call. Used outside an LMS, and as the reference for the SCORM adapter. */
export function createConsoleReporter(log: (...args: unknown[]) => void = console.info): Reporter {
  return {
    start: () => log('[tracking] start'),
    learnerName: () => null,
    event: (event) => log('[tracking]', event.name, event),
    saveProgress: (state) => log('[tracking] progress', state.phase, `round ${state.round}`),
    complete: (result) => log('[tracking] complete', result),
    finish: () => log('[tracking] finish'),
  };
}

/** A reporter that does nothing, for production builds outside an LMS. */
export const silentReporter: Reporter = {
  start: () => undefined,
  learnerName: () => null,
  event: () => undefined,
  saveProgress: () => undefined,
  complete: () => undefined,
  finish: () => undefined,
};
