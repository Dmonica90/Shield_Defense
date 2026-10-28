import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../game/machine';
import type { GameState } from '../game/types';
import { createScormReporter, displayName } from './scormReporter';
import type { ScormApi } from './scormReporter';

/** A fake driver that records every call, in order. */
function fakeScorm(learner: Partial<ReturnType<ScormApi['getLearnerInfo']>> = {}, suspendData: unknown = '') {
  const calls: [string, ...unknown[]][] = [];
  let initialized = false;
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return true;
    };
  const scorm: ScormApi = {
    get isInitialized() {
      return initialized;
    },
    initialize: () => {
      calls.push(['initialize']);
      initialized = true;
      return true;
    },
    terminate: record('terminate'),
    getLearnerInfo: () => ({ id: '1', name: 'Vázquez, Mónica', entry: 'ab-initio', mode: 'normal', ...learner }),
    getSuspendData: () => suspendData,
    setSuspendData: record('setSuspendData'),
    setInProgress: record('setInProgress'),
    setScore: record('setScore'),
    setComplete: record('setComplete'),
    recordInteraction: record('recordInteraction'),
    setSessionTime: record('setSessionTime'),
  };
  return { scorm, calls, names: () => calls.map(([name]) => name) };
}

const midGame: GameState = { ...initialState, phase: 'areaSelect', startedAt: 0 };

beforeEach(() => {
  vi.stubGlobal('window', { addEventListener: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SCORM reporter', () => {
  it('initializes once, on the first call', () => {
    const { scorm, names } = fakeScorm();
    const reporter = createScormReporter(scorm);
    reporter.learnerName();
    reporter.start();
    reporter.start();
    expect(names()).toEqual(['initialize']);
  });

  it('shows the LMS name as "First Last"', () => {
    const { scorm } = fakeScorm();
    expect(createScormReporter(scorm).learnerName()).toBe('Mónica Vázquez');
    expect(displayName('Mónica Vázquez')).toBe('Mónica Vázquez');
    expect(displayName('  ')).toBeNull();
  });

  it('resumes from suspend data only when the LMS says so', () => {
    expect(createScormReporter(fakeScorm({ entry: 'ab-initio' }, midGame).scorm).savedProgress()).toBeNull();
    expect(createScormReporter(fakeScorm({ entry: 'resume' }, midGame).scorm).savedProgress()).toEqual(midGame);
    expect(createScormReporter(fakeScorm({ entry: 'resume' }, { junk: true }).scorm).savedProgress()).toBeNull();
  });

  it('bookmarks the phase and keeps the checkpoint only for resumable phases', () => {
    const { scorm, calls } = fakeScorm();
    const reporter = createScormReporter(scorm);
    reporter.saveProgress(midGame);
    reporter.saveProgress({ ...midGame, phase: 'gameOver' });
    expect(calls.slice(1)).toEqual([
      ['setInProgress', 'areaSelect'],
      ['setSuspendData', midGame],
      ['setInProgress', 'gameOver'],
      ['setSuspendData', ''],
    ]);
  });

  it('sends the score before the status, then stops saving progress', () => {
    const { scorm, calls } = fakeScorm();
    const reporter = createScormReporter(scorm);
    reporter.complete({ score: 100, passed: true, seconds: 600 });
    reporter.saveProgress({ ...midGame, phase: 'certificate' });
    reporter.complete({ score: 0, passed: false, seconds: 600 });
    expect(calls.slice(1)).toEqual([
      ['setScore', { raw: 100, min: 0, max: 100 }],
      ['setComplete', 'passed'],
    ]);
  });

  it('reports a failed run as failed', () => {
    const { scorm, calls } = fakeScorm();
    createScormReporter(scorm).complete({ score: 0, passed: false, seconds: 600 });
    expect(calls.at(-1)).toEqual(['setComplete', 'failed']);
  });

  it('records decisions and evaluation answers as interactions with unique ids', () => {
    const { scorm, calls } = fakeScorm();
    const reporter = createScormReporter(scorm);
    const decision = { name: 'decision_submitted', area: 'finanzas', cycle: 1, option: 'B', seconds: 12 } as const;
    reporter.event({ ...decision, correct: false });
    reporter.event({ name: 'hotspot_explored', area: 'finanzas', cycle: 1, hotspot: 'chat' });
    reporter.event({ name: 'evaluation_submitted', question: 1, answer: 'skipped' });
    reporter.event({ name: 'evaluation_submitted', question: 2, answer: true, correct: false });
    reporter.event({ name: 'evaluation_submitted', question: 2, answer: false, correct: true });
    reporter.event({ name: 'run_restarted' });
    reporter.event({ ...decision, correct: true });

    const interactions = calls.filter(([name]) => name === 'recordInteraction').map(([, i]) => i);
    expect(interactions).toMatchObject([
      { id: 'run1-finanzas-cycle1', type: 'choice', response: 'B', result: 'incorrect', latency: 12 },
      { id: 'run1-evaluation-q1', type: 'other', response: 'skipped', result: 'neutral' },
      { id: 'run1-evaluation-q2', type: 'true-false', response: 'true', correct: 'false', result: 'incorrect' },
      { id: 'run1-evaluation-q2-2', type: 'true-false', response: 'false', result: 'correct' },
      { id: 'run2-finanzas-cycle1', type: 'choice', result: 'correct' },
    ]);
  });

  it('sends the session time right before terminating, once', () => {
    let clock = 1_000;
    const { scorm, calls } = fakeScorm();
    const reporter = createScormReporter(scorm, () => clock);
    reporter.start();
    clock += 95_400;
    reporter.finish();
    reporter.finish();
    reporter.saveProgress(midGame);
    expect(calls).toEqual([['initialize'], ['setSessionTime', 95], ['terminate']]);
  });

  it('finishes the session when the page is closed', () => {
    const { scorm } = fakeScorm();
    createScormReporter(scorm).start();
    expect(window.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
  });
});
