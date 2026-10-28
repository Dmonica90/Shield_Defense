import { cycleContent } from '../content/schema';
import type { Story } from '../content/schema';
import { securedCount } from '../game/machine';
import { AREA_IDS, LEVEL_BY_CYCLE, OPTION_IDS } from '../game/types';
import type { GameState } from '../game/types';
import type { TrackingEvent } from './events';
import { isResumable, parseProgress } from './progress';
import type { Reporter } from './reporter';

/**
 * The part of the SCORM 2004 driver (`scorm/2004-4th/core/scorm-driver.js`,
 * loaded by the packaged `index.html` as the global `SCORM`) that the course uses.
 * The driver is vendored unchanged; everything course-specific lives here.
 */
export type ScormDriver = {
  initialize(): boolean;
  terminate(): boolean;
  getValue(element: string): string | null;
  setValue(element: string, value: string): boolean;
  commit(): boolean;
  getSuspendData(): unknown;
  setSuspendData(data: unknown): void;
  setInProgress(location?: string): void;
  setScore(score: { raw: number; min: number; max: number }): void;
  setComplete(success: 'passed' | 'failed' | 'unknown'): void;
  setSessionTime(seconds: number): void;
  getLearnerInfo(): { id: string | null; name: string | null; entry: string | null; mode: string | null };
  readonly isInitialized: boolean;
};

// The driver declares `const SCORM = (function () { … })()` in a classic script:
// a global binding, but not a property of `window`, so it is read by name.
declare const SCORM: ScormDriver | undefined;

/** The driver the packaged course loads before the app, or null outside the package. */
export function scormDriver(): ScormDriver | null {
  return typeof SCORM === 'undefined' ? null : SCORM;
}

/** Suspend data is versioned so a later release can tell an old save from a new one. */
const SAVE_VERSION = 1;

/** `cmi.*.description` is a localized string with a 250-character smallest permitted maximum. */
const DESCRIPTION_MAX = 250;
/** `long-fill-in` learner responses allow 4000 characters. */
const RESPONSE_MAX = 4000;

/** SCORM 2004 `time(second,10,0)`: ISO 8601 with at most two decimals of a second. */
export function scormTimestamp(date: Date): string {
  return date.toISOString().replace(/\.(\d{2})\d*Z$/, '.$1Z');
}

/** SCORM 2004 `timeinterval(second,10,2)`, e.g. `PT12.40S`. */
export function scormDuration(seconds: number): string {
  return `PT${Math.max(0, seconds).toFixed(2)}S`;
}

/** LMSs usually send `cmi.learner_name` as "Last, First"; the certificate wants "First Last". */
export function displayName(lmsName: string | null): string | null {
  const name = lmsName?.trim();
  if (!name) return null;
  const [last, first] = name.split(',').map((part) => part.trim());
  return first ? `${first} ${last}` : name;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const localized = (text: string) => `{lang=es}${clip(text, DESCRIPTION_MAX - 9)}`;

/**
 * Reports the whole course to a SCORM 2004 LMS (Workday Learning):
 *
 * - every decision → a `choice` interaction (answer, right answer, result, latency);
 * - each area's verified fragment → an objective, passed or failed;
 * - the two evaluation questions → `long-fill-in` and `true-false` interactions;
 * - progress → `cmi.progress_measure`, `cmi.location` and `cmi.suspend_data`;
 * - the end → score first, then completion and success, then session time and terminate.
 *
 * Game over leaves the attempt incomplete with no saved run, so relaunching starts over.
 */
export function createScormReporter(api: ScormDriver, story: Story, now: () => number = Date.now): Reporter {
  const startedAt = now();
  let completed = false;
  let finished = false;
  const objectiveIndex = new Map<string, number>();

  /** Index of the next free interaction, so a resumed session never overwrites the last one's. */
  const nextInteraction = () => Number(api.getValue('cmi.interactions._count') ?? '0') || 0;

  function readObjectives() {
    const count = Number(api.getValue('cmi.objectives._count') ?? '0') || 0;
    for (let n = 0; n < count; n++) {
      const id = api.getValue(`cmi.objectives.${n}.id`);
      if (id) objectiveIndex.set(id, n);
    }
  }

  function interaction(fields: {
    id: string;
    type: 'choice' | 'true-false' | 'long-fill-in';
    response: string;
    correct?: string;
    result: 'correct' | 'incorrect' | 'neutral';
    description: string;
    latency?: number;
  }) {
    const base = `cmi.interactions.${nextInteraction()}`;
    api.setValue(`${base}.id`, fields.id);
    api.setValue(`${base}.type`, fields.type);
    api.setValue(`${base}.timestamp`, scormTimestamp(new Date(now())));
    api.setValue(`${base}.description`, localized(fields.description));
    api.setValue(`${base}.learner_response`, fields.response);
    if (fields.correct !== undefined) api.setValue(`${base}.correct_responses.0.pattern`, fields.correct);
    api.setValue(`${base}.result`, fields.result);
    if (fields.latency !== undefined) api.setValue(`${base}.latency`, scormDuration(fields.latency));
    api.commit();
  }

  function objective(id: string, passed: boolean, description: string) {
    let n = objectiveIndex.get(id);
    if (n === undefined) {
      n = Number(api.getValue('cmi.objectives._count') ?? '0') || 0;
      objectiveIndex.set(id, n);
      api.setValue(`cmi.objectives.${n}.id`, id);
      api.setValue(`cmi.objectives.${n}.description`, localized(description));
    }
    api.setValue(`cmi.objectives.${n}.success_status`, passed ? 'passed' : 'failed');
    api.setValue(`cmi.objectives.${n}.completion_status`, 'completed');
    api.commit();
  }

  function onEvent(event: TrackingEvent, state: GameState) {
    const run = `s${state.seed}`;
    switch (event.name) {
      case 'decision_submitted': {
        const content = story.areas[event.area];
        const options = cycleContent(story, event.area, event.cycle).options;
        const right = OPTION_IDS.find((id) => options[id].correct);
        interaction({
          id: `${event.area}-c${event.cycle}-${run}`,
          type: 'choice',
          response: event.option,
          correct: right,
          result: event.correct ? 'correct' : 'incorrect',
          description: `${content.name} · ${story.levels[LEVEL_BY_CYCLE[event.cycle]].name}: ${options[event.option].text}`,
          latency: event.seconds,
        });
        break;
      }
      case 'fragment_verified':
        objective(event.area, event.genuine, `${story.areas[event.area].name}: ${story.areas[event.area].title}`);
        api.setValue('cmi.progress_measure', (securedCount(state) / AREA_IDS.length).toFixed(2));
        api.commit();
        break;
      case 'evaluation_submitted':
        if (event.question === 1) {
          const text = state.evaluation.reflection;
          interaction({
            id: `reflexion-${run}`,
            type: 'long-fill-in',
            response: text ? `{lang=es}${clip(text, RESPONSE_MAX - 9)}` : '{lang=es}(omitida)',
            result: 'neutral',
            description: story.evaluation.q1,
          });
        } else {
          interaction({
            id: `dlp-${run}`,
            type: 'true-false',
            response: String(event.answer),
            correct: 'false',
            result: event.correct ? 'correct' : 'incorrect',
            description: story.evaluation.q2,
          });
        }
        break;
      default:
        break;
    }
  }

  return {
    inLms: true,

    start() {
      if (api.isInitialized || !api.initialize()) return;
      readObjectives();
    },

    learnerName: () => displayName(api.getLearnerInfo().name),

    savedProgress() {
      if (api.getLearnerInfo().entry !== 'resume') return null;
      const saved = api.getSuspendData() as { v?: number; state?: unknown } | null;
      return saved && typeof saved === 'object' && saved.v === SAVE_VERSION ? parseProgress(saved.state) : null;
    },

    event: onEvent,

    saveProgress(state) {
      if (completed || finished) return;
      const location = [state.phase, state.currentArea, `r${state.round}`].filter(Boolean).join(':');
      api.setInProgress(location);
      // A run that cannot be resumed (game over, a fresh start) leaves nothing to come back to.
      api.setSuspendData(isResumable(state.phase) ? { v: SAVE_VERSION, state } : '');
    },

    complete({ score, passed }) {
      if (completed) return;
      completed = true;
      api.setValue('cmi.progress_measure', '1');
      api.setScore({ raw: score, min: 0, max: 100 });
      api.setComplete(passed ? 'passed' : 'failed');
      api.setSuspendData('');
    },

    finish() {
      if (finished || !api.isInitialized) return;
      finished = true;
      api.setSessionTime(Math.round((now() - startedAt) / 1000));
      api.terminate();
    },
  };
}
