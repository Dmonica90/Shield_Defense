import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../game/machine';
import type { GameAction, GameState } from '../game/types';
import { eventsFor } from './events';
import type { TrackingEvent } from './events';

/** Runs actions through the reducer, collecting the events each transition emits. */
function trace(actions: GameAction[], start: GameState = initialState) {
  const events: TrackingEvent[] = [];
  let state = start;
  for (const action of actions) {
    const next = reducer(state, action);
    events.push(...eventsFor(state, action, next));
    state = next;
  }
  return { state, events };
}

const open: GameAction[] = [
  { type: 'loaded', now: 0, seed: 1 },
  { type: 'introDone' },
  { type: 'rulesDone', skipped: true },
];

const area = (id: 'atencion' | 'desarrollo' | 'finanzas' | 'operaciones', right: boolean): GameAction[] => [
  { type: 'openArea', area: id, now: 10_000 },
  { type: 'beginExplore' },
  { type: 'exploreHotspot', hotspot: 'chat' },
  { type: 'goToDecision' },
  { type: 'selectOption', option: 'B' },
  { type: 'submitDecision', now: 22_400, isCorrect: right },
  { type: 'continueFromFragment' },
];

describe('tracking events', () => {
  it('reports launch, intro, skipped rules and the first round', () => {
    const { events } = trace(open);
    expect(events).toEqual([
      { name: 'course_launched', at: 0 },
      { name: 'content_viewed', content: 'intro', action: 'viewed' },
      { name: 'content_viewed', content: 'rules', action: 'skipped' },
      { name: 'round_started', round: 1, level: 'easy' },
    ]);
  });

  it('reports an area, its hotspot and the decision with its latency', () => {
    const { events } = trace([...open, ...area('atencion', false)]);
    expect(events.slice(4)).toEqual([
      { name: 'area_started', area: 'atencion', cycle: 1 },
      { name: 'hotspot_explored', area: 'atencion', cycle: 1, hotspot: 'chat' },
      { name: 'decision_submitted', area: 'atencion', cycle: 1, option: 'B', correct: false, seconds: 12 },
    ]);
  });

  it('reports verification, the failure and the next round at a harder level', () => {
    const { events } = trace([
      ...open,
      ...area('atencion', false),
      ...area('desarrollo', true),
      ...area('finanzas', true),
      ...area('operaciones', true),
      { type: 'consoleDone' },
      { type: 'nextRound' },
    ]);
    const tail = events.slice(events.findIndex((e) => e.name === 'console_viewed'));
    expect(tail).toEqual([
      { name: 'console_viewed', round: 1 },
      { name: 'fragment_verified', area: 'atencion', cycle: 1, genuine: false },
      { name: 'fragment_verified', area: 'desarrollo', cycle: 1, genuine: true },
      { name: 'fragment_verified', area: 'finanzas', cycle: 1, genuine: true },
      { name: 'fragment_verified', area: 'operaciones', cycle: 1, genuine: true },
      { name: 'failure_recorded', failures: 1, round: 1, areas: ['atencion'] },
      { name: 'round_started', round: 2, level: 'medium' },
    ]);
  });

  it('reports the evaluation and a passing completion', () => {
    const { events } = trace([
      ...open,
      ...area('atencion', true),
      ...area('desarrollo', true),
      ...area('finanzas', true),
      ...area('operaciones', true),
      { type: 'consoleDone' },
      { type: 'debriefDone' },
      { type: 'skipReflection' },
      { type: 'answerDlp', answer: true },
      { type: 'answerDlp', answer: false },
      { type: 'finish', now: 600_000 },
    ]);
    expect(events.slice(-5)).toEqual([
      { name: 'debrief_viewed' },
      { name: 'evaluation_submitted', question: 1, answer: 'skipped' },
      { name: 'evaluation_submitted', question: 2, answer: true, correct: false },
      { name: 'evaluation_submitted', question: 2, answer: false, correct: true },
      { name: 'course_completed', score: 100, passed: true, seconds: 600 },
    ]);
  });

  it('emits nothing for a rejected action', () => {
    expect(trace([{ type: 'introDone' }]).events).toEqual([]);
  });
});
