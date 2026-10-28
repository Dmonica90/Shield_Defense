import type { GameState } from '../game/types';
import type { TrackingEvent } from './events';

/**
 * Where grades and progress go. The game talks only to this interface: outside
 * an LMS it logs to the console (or does nothing), and inside Workday the SCORM
 * 2004 reporter in `scorm.ts` maps the same calls onto `cmi.*`, with no change
 * to the screens or the rules.
 */
export type Reporter = {
  /** True when a real LMS is listening, so the game defers resume and exit to it. */
  readonly inLms: boolean;
  start(): void;
  /** The learner's name, when the host (an LMS) knows it. */
  learnerName(): string | null;
  /** A run saved by the host on an earlier launch, if it keeps one. */
  savedProgress(): GameState | null;
  /** One tracking event, with the state right after the transition that caused it. */
  event(event: TrackingEvent, state: GameState): void;
  saveProgress(state: GameState): void;
  complete(result: { score: number; passed: boolean; seconds: number }): void;
  finish(): void;
};

/** Logs every call. Used outside an LMS, and as the reference for the SCORM adapter. */
export function createConsoleReporter(log: (...args: unknown[]) => void = console.info): Reporter {
  return {
    inLms: false,
    start: () => log('[tracking] start'),
    learnerName: () => null,
    savedProgress: () => null,
    event: (event) => log('[tracking]', event.name, event),
    saveProgress: (state) => log('[tracking] progress', state.phase, `round ${state.round}`),
    complete: (result) => log('[tracking] complete', result),
    finish: () => log('[tracking] finish'),
  };
}

/** A reporter that does nothing, for production builds outside an LMS. */
export const silentReporter: Reporter = {
  inLms: false,
  start: () => undefined,
  learnerName: () => null,
  savedProgress: () => null,
  event: () => undefined,
  saveProgress: () => undefined,
  complete: () => undefined,
  finish: () => undefined,
};
