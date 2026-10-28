import type { TrackingEvent } from './events';
import { isResumable, parseProgress } from './progress';
import type { Reporter } from './reporter';

/**
 * The slice of the SCORM 2004 driver (`core/scorm-driver.js` in the package,
 * from github.com/jeffbatt01/scorm-drivers) that the course uses. The driver
 * is a classic script the SCORM build puts in `<head>`, so it is loaded before
 * React mounts.
 */
export type ScormApi = {
  readonly isInitialized: boolean;
  initialize(): boolean;
  terminate(): boolean;
  getLearnerInfo(): { id: string; name: string; entry: string; mode: string };
  getSuspendData(): unknown;
  setSuspendData(data: unknown): boolean;
  setInProgress(location: string): boolean;
  setScore(score: { raw: number; min: number; max: number }): boolean;
  setComplete(successStatus: 'passed' | 'failed' | 'unknown'): boolean;
  recordInteraction(interaction: {
    id: string;
    type: 'choice' | 'true-false' | 'other';
    response: string;
    correct?: string;
    result: 'correct' | 'incorrect' | 'neutral';
    description?: string;
    latency?: number;
  }): boolean;
  setSessionTime(seconds: number): boolean;
};

// The driver declares `const SCORM` at the top level: a global, but not a
// property of `window`, so it can only be reached by name.
declare const SCORM: ScormApi | undefined;

/** The SCORM driver, when the page was loaded from the SCORM package. */
export function scormDriver(): ScormApi | null {
  return typeof SCORM === 'undefined' ? null : SCORM;
}

/**
 * Maps the `Reporter` calls onto SCORM 2004 (see the table in README.md). The
 * driver's call-order rules live here: initialize first, score before status,
 * no `setInProgress` once complete, session time right before terminate.
 */
export function createScormReporter(scorm: ScormApi, now: () => number = Date.now): Reporter {
  const startedAt = now();
  let completed = false;
  let finished = false;
  // A restart replays the same areas and the DLP question can be answered more
  // than once, but interaction ids must stay unique per session.
  let run = 1;
  const seen = new Map<string, number>();
  const uniqueId = (id: string) => {
    const count = (seen.get(id) ?? 0) + 1;
    seen.set(id, count);
    return count === 1 ? id : `${id}-${count}`;
  };

  // `learnerName` and `savedProgress` are read while App renders, before the
  // `start` effect, so whichever call comes first opens the session.
  const ready = () => {
    if (!scorm.isInitialized) scorm.initialize();
    return scorm.isInitialized;
  };

  const finish = () => {
    if (finished || !ready()) return;
    finished = true;
    scorm.setSessionTime(Math.round((now() - startedAt) / 1000));
    scorm.terminate();
  };

  return {
    start() {
      ready();
      // Closing the LMS window or tab without pressing "exit" still has to end the session.
      window.addEventListener('pagehide', finish);
    },

    learnerName() {
      if (!ready()) return null;
      return displayName(scorm.getLearnerInfo().name);
    },

    savedProgress() {
      if (!ready() || scorm.getLearnerInfo().entry !== 'resume') return null;
      return parseProgress(scorm.getSuspendData());
    },

    event(event) {
      if (finished || !ready()) return;
      const interaction = interactionFor(event, run);
      if (interaction) scorm.recordInteraction({ ...interaction, id: uniqueId(interaction.id) });
      if (event.name === 'run_restarted') run += 1;
    },

    saveProgress(state) {
      // After `setComplete` the driver forbids going back to "incomplete".
      if (completed || finished || !ready()) return;
      scorm.setInProgress(state.phase);
      scorm.setSuspendData(isResumable(state) ? state : '');
    },

    complete({ score, passed }) {
      if (completed || finished || !ready()) return;
      completed = true;
      scorm.setScore({ raw: score, min: 0, max: 100 });
      scorm.setComplete(passed ? 'passed' : 'failed');
    },

    finish,
  };
}

/** LMSs usually send "Last, First"; the certificate reads better as "First Last". */
export function displayName(name: string): string | null {
  const parts = name.split(',').map((part) => part.trim());
  const shown = parts.length === 2 && parts[0] && parts[1] ? `${parts[1]} ${parts[0]}` : name.trim();
  return shown || null;
}

/** Decisions and evaluation answers become `cmi.interactions`; other events stay local. */
function interactionFor(event: TrackingEvent, run: number): Parameters<ScormApi['recordInteraction']>[0] | null {
  switch (event.name) {
    case 'decision_submitted':
      return {
        id: `run${run}-${event.area}-cycle${event.cycle}`,
        type: 'choice',
        response: event.option,
        result: event.correct ? 'correct' : 'incorrect',
        description: `Decision: ${event.area}, cycle ${event.cycle}`,
        latency: event.seconds,
      };

    case 'evaluation_submitted':
      // The reflection is free text with no right answer; only whether it was answered is sent.
      return event.question === 1
        ? {
            id: `run${run}-evaluation-q1`,
            type: 'other',
            response: event.answer === 'text' ? 'answered' : 'skipped',
            result: 'neutral',
            description: 'Evaluation: reflection',
          }
        : {
            id: `run${run}-evaluation-q2`,
            type: 'true-false',
            response: String(event.answer),
            correct: 'false',
            result: event.correct ? 'correct' : 'incorrect',
            description: 'Evaluation: the DLP spies on me',
          };

    default:
      return null;
  }
}
