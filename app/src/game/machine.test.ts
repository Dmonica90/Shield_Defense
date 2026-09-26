import { describe, expect, it } from 'vitest';
import {
  canCertify,
  falseAreas,
  heldCount,
  initialState,
  optionOrder,
  pendingAreas,
  reducer,
  score,
  securedCount,
  verification,
} from './machine';
import { AREA_IDS, MAX_FAILURES } from './types';
import type { AreaId, GameAction, GameState } from './types';

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(reducer, state);

const REFLECTION = 'La de operaciones, porque el manager llevaba años confiando en ese script.';

/** Title through rules, standing on the area selector. */
function atAreaSelect(): GameState {
  return run(
    initialState,
    { type: 'loaded', now: 0, seed: 42 },
    { type: 'introDone' },
    { type: 'rulesDone', skipped: false },
  );
}

/** Plays one area start to finish, answering right or wrong. */
function play(state: GameState, area: AreaId, right: boolean): GameState {
  return run(
    state,
    { type: 'openArea', area, now: 1000 },
    { type: 'beginExplore' },
    { type: 'exploreHotspot', hotspot: 'chat' },
    { type: 'goToDecision' },
    { type: 'selectOption', option: right ? 'A' : 'B' },
    { type: 'submitDecision', now: 4000, isCorrect: right },
    { type: 'continueFromFragment' },
  );
}

/** Plays every area still open this round; `wrong` lists the ones to miss. */
function playRound(state: GameState, wrong: AreaId[] = []): GameState {
  return pendingAreas(state).reduce((s, area) => play(s, area, !wrong.includes(area)), state);
}

function finishEvaluation(state: GameState): GameState {
  return run(
    state,
    { type: 'debriefDone' },
    { type: 'submitReflection', text: REFLECTION },
    { type: 'answerDlp', answer: false },
  );
}

describe('opening', () => {
  it('goes loading → intro → rules → area select', () => {
    let s = reducer(initialState, { type: 'loaded', now: 5, seed: 9 });
    expect(s).toMatchObject({ phase: 'intro', startedAt: 5, seed: 9 });
    s = reducer(s, { type: 'introDone' });
    expect(s.phase).toBe('rules');
    s = reducer(s, { type: 'rulesDone', skipped: true });
    expect(s.phase).toBe('areaSelect');
    expect(pendingAreas(s)).toEqual([...AREA_IDS]);
  });
});

describe('inside an area', () => {
  it('cannot submit without choosing an option', () => {
    const s = run(
      atAreaSelect(),
      { type: 'openArea', area: 'atencion', now: 0 },
      { type: 'beginExplore' },
      { type: 'goToDecision' },
    );
    expect(reducer(s, { type: 'submitDecision', now: 1, isCorrect: true })).toBe(s);
  });

  it('records each hotspot once, in order', () => {
    const s = run(
      atAreaSelect(),
      { type: 'openArea', area: 'desarrollo', now: 0 },
      { type: 'beginExplore' },
      { type: 'exploreHotspot', hotspot: 'code' },
      { type: 'exploreHotspot', hotspot: 'slack' },
      { type: 'exploreHotspot', hotspot: 'code' },
    );
    expect(s.explored).toEqual(['code', 'slack']);
  });

  it('hands over a fragment whether the decision was right or wrong', () => {
    const base = run(
      atAreaSelect(),
      { type: 'openArea', area: 'finanzas', now: 1000 },
      { type: 'beginExplore' },
      { type: 'goToDecision' },
      { type: 'selectOption', option: 'C' },
    );
    const right = reducer(base, { type: 'submitDecision', now: 3500, isCorrect: true });
    const wrong = reducer(base, { type: 'submitDecision', now: 3500, isCorrect: false });

    // Same screen, same count in the HUD: nothing gives the answer away.
    expect(right.step).toBe('fragment');
    expect(wrong.step).toBe('fragment');
    expect(heldCount(right)).toBe(1);
    expect(heldCount(wrong)).toBe(1);
    expect(wrong.decisions).toEqual([
      { area: 'finanzas', cycle: 1, option: 'C', correct: false, ms: 2500 },
    ]);
  });

  it('will not reopen an area that already has a fragment this round', () => {
    const s = play(atAreaSelect(), 'atencion', false);
    expect(reducer(s, { type: 'openArea', area: 'atencion', now: 0 })).toBe(s);
  });
});

describe('route A: every decision right', () => {
  it('verifies 4/4 in round 1 and reaches the certificate with 0 failures', () => {
    let s = playRound(atAreaSelect());
    expect(s.phase).toBe('console');
    expect(Object.values(verification(s))).toEqual(['genuine', 'genuine', 'genuine', 'genuine']);

    s = reducer(s, { type: 'consoleDone' });
    expect(s).toMatchObject({ phase: 'debrief', failures: 0 });
    expect(securedCount(s)).toBe(4);

    s = finishEvaluation(s);
    expect(s.phase).toBe('certificate');
    expect(canCertify(s)).toBe(true);
    expect(score(s)).toBe(100);
  });
});

describe('route B: a false fragment, then recovery', () => {
  it('only reveals the false fragment at the console, then replays just that area at cycle 2', () => {
    let s = playRound(atAreaSelect(), ['desarrollo']);
    expect(s.phase).toBe('console');
    expect(heldCount(s)).toBe(4);
    expect(verification(s).desarrollo).toBe('false');

    s = reducer(s, { type: 'consoleDone' });
    expect(s).toMatchObject({ phase: 'roundEnd', failures: 1 });
    expect(falseAreas(s)).toEqual(['desarrollo']);
    expect(securedCount(s)).toBe(3);

    s = reducer(s, { type: 'nextRound' });
    expect(s).toMatchObject({ phase: 'areaSelect', round: 2 });
    expect(pendingAreas(s)).toEqual(['desarrollo']);

    // Secured areas stay closed.
    expect(reducer(s, { type: 'openArea', area: 'atencion', now: 0 })).toBe(s);

    s = playRound(s);
    expect(s.decisions.at(-1)).toMatchObject({ area: 'desarrollo', cycle: 2, correct: true });
    s = reducer(s, { type: 'consoleDone' });
    expect(s).toMatchObject({ phase: 'debrief', failures: 1 });

    s = finishEvaluation(s);
    expect(canCertify(s)).toBe(true);
  });

  it('wins in round 3 with 2 failures', () => {
    let s = playRound(atAreaSelect(), ['atencion', 'operaciones']);
    s = run(s, { type: 'consoleDone' }, { type: 'nextRound' });
    s = playRound(s, ['operaciones']);
    s = run(s, { type: 'consoleDone' });
    expect(s).toMatchObject({ phase: 'roundEnd', failures: 2 });
    expect(pendingAreas(reducer(s, { type: 'nextRound' }))).toEqual(['operaciones']);

    s = run(s, { type: 'nextRound' });
    expect(s.round).toBe(3);
    s = playRound(s);
    s = run(s, { type: 'consoleDone' });
    expect(s).toMatchObject({ phase: 'debrief', failures: 2 });
  });
});

describe('route C: game over', () => {
  it('ends the run when the third round still has a false fragment', () => {
    let s = playRound(atAreaSelect(), ['finanzas']);
    s = run(s, { type: 'consoleDone' }, { type: 'nextRound' });
    s = playRound(s, ['finanzas']);
    s = run(s, { type: 'consoleDone' }, { type: 'nextRound' });
    s = playRound(s, ['finanzas']);
    s = reducer(s, { type: 'consoleDone' });

    expect(s).toMatchObject({ phase: 'gameOver', failures: MAX_FAILURES });
    expect(securedCount(s)).toBe(3);
    expect(canCertify(s)).toBe(false);
    expect(score(s)).toBe(0);
  });

  it('restart wipes everything and returns to the area selector', () => {
    let s = playRound(atAreaSelect(), [...AREA_IDS]);
    s = reducer(s, { type: 'consoleDone' });
    s = reducer(s, { type: 'restart', now: 99, seed: 7 });
    expect(s).toMatchObject({ phase: 'areaSelect', round: 1, failures: 0, decisions: [], startedAt: 99, seed: 7 });
    expect(pendingAreas(s)).toEqual([...AREA_IDS]);
  });
});

describe('evaluation', () => {
  function atEvaluation() {
    return run(playRound(atAreaSelect()), { type: 'consoleDone' }, { type: 'debriefDone' });
  }

  it('rejects a reflection shorter than 50 characters but allows skipping', () => {
    const s = atEvaluation();
    expect(reducer(s, { type: 'submitReflection', text: 'muy corta' })).toBe(s);
    expect(reducer(s, { type: 'skipReflection' }).evaluation.reflection).toBe('');
  });

  it('keeps asking until the DLP question is answered "false"', () => {
    let s = reducer(atEvaluation(), { type: 'skipReflection' });
    s = reducer(s, { type: 'answerDlp', answer: true });
    expect(s.phase).toBe('evaluation');
    expect(canCertify(s)).toBe(false);
    s = reducer(s, { type: 'answerDlp', answer: false });
    expect(s.phase).toBe('certificate');
    expect(canCertify(s)).toBe(true);
  });

  it('does not take the DLP answer before the reflection', () => {
    const s = atEvaluation();
    expect(reducer(s, { type: 'answerDlp', answer: false })).toBe(s);
  });
});

describe('resume and option order', () => {
  it('resume restores a saved state as-is', () => {
    const saved = playRound(atAreaSelect(), ['atencion']);
    expect(reducer(initialState, { type: 'resume', state: saved })).toBe(saved);
  });

  it('shuffles options deterministically per seed, and not always with A first', () => {
    expect(optionOrder(42, 'atencion', 1)).toEqual(optionOrder(42, 'atencion', 1));
    const firsts = new Set<string>();
    for (let seed = 1; seed < 40; seed += 1) {
      const order = optionOrder(seed, 'finanzas', 2);
      expect([...order].sort()).toEqual(['A', 'B', 'C']);
      firsts.add(order[0]);
    }
    expect(firsts.size).toBe(3);
  });
});
