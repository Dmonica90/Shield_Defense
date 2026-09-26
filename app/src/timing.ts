/**
 * Durations for the beats the design fixes in time. `?fast=1` shrinks them so
 * the browser tests can play a whole run without sitting through 30 seconds of
 * console animation; nothing else changes in that mode.
 */
const FAST =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fast') === '1';

const scale = (ms: number) => (FAST ? Math.min(ms, 150) : ms);

export const TIMING = {
  /** The loading bar on the first screen (3–5 s in the design). */
  loading: scale(3500),
  /** The final verification that activates the protocol: 30 s, not skippable. */
  consoleWin: scale(30_000),
  /** A failed verification: long enough to read which fragments were false. */
  consoleFail: scale(9000),
  /** Each debrief card stays up for 5 s before the next one fades in. */
  debriefCard: scale(5000),
  /** Inactivity before the session pauses (15 min). */
  idle: FAST ? 60_000 : 15 * 60_000,
  /** How long the intro video may take to start before the retry dialog. */
  videoTimeout: scale(5000),
};

export const IS_FAST = FAST;
