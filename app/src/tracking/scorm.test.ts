import { describe, expect, it } from 'vitest';
import { STORIES } from '../content';
import { initialState, reducer } from '../game/machine';
import type { GameAction, GameState } from '../game/types';
import { eventsFor } from './events';
import { createScormReporter, displayName, scormDuration, scormTimestamp } from './scorm';
import type { ScormDriver } from './scorm';

/**
 * A stand-in for the driver over an in-memory LMS: it keeps `cmi.*` in a map,
 * keeps `_count`s the way an LMS does, and logs the helper calls in order.
 */
function fakeLms(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const calls: string[] = [];
  let initialized = false;

  const bumpCount = (element: string) => {
    const m = /^cmi\.(interactions|objectives)\.(\d+)\.id$/.exec(element);
    if (!m) return;
    const key = `cmi.${m[1]}._count`;
    store.set(key, String(Math.max(Number(store.get(key) ?? 0), Number(m[2]) + 1)));
  };

  const api: ScormDriver = {
    initialize: () => {
      calls.push('initialize');
      initialized = true;
      return true;
    },
    terminate: () => {
      calls.push('terminate');
      initialized = false;
      return true;
    },
    getValue: (element) => store.get(element) ?? (element.endsWith('._count') ? '0' : ''),
    setValue: (element, value) => {
      store.set(element, value);
      bumpCount(element);
      return true;
    },
    commit: () => true,
    getSuspendData: () => {
      const raw = store.get('cmi.suspend_data');
      try {
        return raw ? JSON.parse(raw) : '';
      } catch {
        return raw;
      }
    },
    setSuspendData: (data) => {
      store.set('cmi.suspend_data', typeof data === 'object' ? JSON.stringify(data) : String(data));
    },
    setInProgress: (location) => {
      calls.push('setInProgress');
      store.set('cmi.completion_status', 'incomplete');
      if (location) store.set('cmi.location', location);
    },
    setScore: ({ raw, min, max }) => {
      calls.push('setScore');
      store.set('cmi.score.raw', String(raw));
      store.set('cmi.score.min', String(min));
      store.set('cmi.score.max', String(max));
    },
    setComplete: (success) => {
      calls.push('setComplete');
      store.set('cmi.completion_status', 'completed');
      store.set('cmi.success_status', success);
    },
    setSessionTime: () => calls.push('setSessionTime'),
    getLearnerInfo: () => ({
      id: 'u1',
      name: store.get('cmi.learner_name') ?? 'Pérez, Ana',
      entry: store.get('cmi.entry') ?? 'ab-initio',
      mode: 'normal',
    }),
    get isInitialized() {
      return initialized;
    },
  };
  return { api, store, calls };
}

const story = STORIES.es;

/** Drives the reducer and feeds the reporter exactly as `useTrackedReducer` does. */
function play(reporter: ReturnType<typeof createScormReporter>, actions: GameAction[], start: GameState = initialState) {
  let state = start;
  for (const action of actions) {
    const next = reducer(state, action);
    if (next === state) continue;
    for (const event of eventsFor(state, action, next)) {
      reporter.event(event, next);
      if (event.name === 'course_completed') reporter.complete(event);
    }
    reporter.saveProgress(next);
    state = next;
  }
  return state;
}

const opening: GameAction[] = [
  { type: 'loaded', now: 0, seed: 7 },
  { type: 'introDone' },
  { type: 'rulesDone', skipped: true },
];

const areaRun = (area: 'atencion' | 'desarrollo' | 'finanzas' | 'operaciones', right: boolean): GameAction[] => [
  { type: 'openArea', area, now: 1_000 },
  { type: 'beginExplore' },
  { type: 'goToDecision' },
  { type: 'selectOption', option: right ? 'A' : 'B' },
  { type: 'submitDecision', now: 13_000, isCorrect: right },
  { type: 'continueFromFragment' },
];

const reflection = 'Fue difícil decidir en Desarrollo porque el compañero era de confianza y tenía prisa.';

const winningRun: GameAction[] = [
  ...opening,
  ...(['atencion', 'desarrollo', 'finanzas', 'operaciones'] as const).flatMap((a) => areaRun(a, true)),
  { type: 'consoleDone' },
  { type: 'debriefDone' },
  { type: 'submitReflection', text: reflection },
  { type: 'answerDlp', answer: false },
  { type: 'finish', now: 600_000 },
];

describe('SCORM 2004 reporter', () => {
  it('reports a clean run: interactions, objectives, score before status, terminate last', () => {
    const { api, store, calls } = fakeLms();
    const reporter = createScormReporter(api, story, () => 0);
    reporter.start();
    play(reporter, winningRun);
    reporter.finish();

    expect(store.get('cmi.score.raw')).toBe('100');
    expect(store.get('cmi.completion_status')).toBe('completed');
    expect(store.get('cmi.success_status')).toBe('passed');
    expect(store.get('cmi.progress_measure')).toBe('1');
    expect(store.get('cmi.suspend_data')).toBe('');

    // Four decisions, the reflection and the DLP question.
    expect(store.get('cmi.interactions._count')).toBe('6');
    expect(store.get('cmi.interactions.0.id')).toBe('atencion-c1-s7');
    expect(store.get('cmi.interactions.0.type')).toBe('choice');
    expect(store.get('cmi.interactions.0.learner_response')).toBe('A');
    expect(store.get('cmi.interactions.0.correct_responses.0.pattern')).toBe('A');
    expect(store.get('cmi.interactions.0.result')).toBe('correct');
    expect(store.get('cmi.interactions.0.latency')).toBe('PT12.00S');
    expect(store.get('cmi.interactions.4.type')).toBe('long-fill-in');
    expect(store.get('cmi.interactions.4.learner_response')).toBe(`{lang=es}${reflection}`);
    expect(store.get('cmi.interactions.5.type')).toBe('true-false');
    expect(store.get('cmi.interactions.5.result')).toBe('correct');

    expect(store.get('cmi.objectives._count')).toBe('4');
    expect(store.get('cmi.objectives.1.id')).toBe('desarrollo');
    expect(store.get('cmi.objectives.1.success_status')).toBe('passed');

    expect(calls.indexOf('setScore')).toBeLessThan(calls.indexOf('setComplete'));
    expect(calls.at(-2)).toBe('setSessionTime');
    expect(calls.at(-1)).toBe('terminate');
    // Nothing reopens the attempt after it was completed.
    expect(calls.lastIndexOf('setInProgress')).toBeLessThan(calls.indexOf('setComplete'));
  });

  it('saves a resumable run and offers it back on the next launch', () => {
    const first = fakeLms();
    const reporter = createScormReporter(first.api, story);
    reporter.start();
    const state = play(reporter, [...opening, ...areaRun('finanzas', false)]);
    expect(first.store.get('cmi.location')).toBe('areaSelect:r1');
    reporter.finish();

    // Relaunch: the LMS hands back the same data with entry = resume.
    const second = fakeLms({ ...Object.fromEntries(first.store), 'cmi.entry': 'resume' });
    const again = createScormReporter(second.api, story);
    again.start();
    expect(again.savedProgress()).toEqual(state);
  });

  it('appends after the interactions of an earlier session instead of overwriting them', () => {
    const { api, store } = fakeLms({
      'cmi.entry': 'resume',
      'cmi.interactions._count': '2',
      'cmi.interactions.0.id': 'atencion-c1-s7',
      'cmi.interactions.1.id': 'desarrollo-c1-s7',
      'cmi.objectives._count': '1',
      'cmi.objectives.0.id': 'atencion',
    });
    const reporter = createScormReporter(api, story);
    reporter.start();
    const start = play(reporter, opening);
    play(reporter, [...areaRun('finanzas', true), ...areaRun('operaciones', true)], start);
    expect(store.get('cmi.interactions.0.id')).toBe('atencion-c1-s7');
    expect(store.get('cmi.interactions.2.id')).toBe('finanzas-c1-s7');
    expect(store.get('cmi.interactions._count')).toBe('4');
  });

  it('leaves a game over incomplete with nothing to resume', () => {
    const { api, store } = fakeLms();
    const reporter = createScormReporter(api, story);
    reporter.start();
    const wrongRound = (['atencion', 'desarrollo', 'finanzas', 'operaciones'] as const).flatMap((a) => areaRun(a, false));
    let s = play(reporter, [...opening, ...wrongRound, { type: 'consoleDone' }, { type: 'nextRound' }]);
    s = play(reporter, [...wrongRound, { type: 'consoleDone' }, { type: 'nextRound' }], s);
    s = play(reporter, [...wrongRound, { type: 'consoleDone' }], s);
    expect(s.phase).toBe('gameOver');
    expect(store.get('cmi.completion_status')).toBe('incomplete');
    expect(store.get('cmi.success_status')).toBeUndefined();
    expect(store.get('cmi.suspend_data')).toBe('');
  });

  it('keeps the suspend data well under the SCORM 2004 limit', () => {
    const { api, store } = fakeLms();
    const reporter = createScormReporter(api, story);
    reporter.start();
    play(reporter, winningRun.slice(0, -1));
    expect(store.get('cmi.suspend_data')!.length).toBeLessThan(8_000);
  });
});

describe('SCORM formats', () => {
  it('writes timestamps with at most two decimals and durations in seconds', () => {
    expect(scormTimestamp(new Date('2026-10-28T10:20:30.456Z'))).toBe('2026-10-28T10:20:30.45Z');
    expect(scormDuration(12.4)).toBe('PT12.40S');
  });

  it('turns "Last, First" into the name the certificate shows', () => {
    expect(displayName('Pérez, Ana')).toBe('Ana Pérez');
    expect(displayName('Ana Pérez')).toBe('Ana Pérez');
    expect(displayName('  ')).toBeNull();
  });
});
