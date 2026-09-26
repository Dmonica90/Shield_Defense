import { AREA_IDS, MAX_FAILURES, OPTION_IDS } from './types';
import type { AreaId, AreaProgress, Cycle, GameAction, GameState, OptionId } from './types';

/**
 * Pure game logic. It moves the player between phases and records decisions;
 * every string lives in the story JSON, and whether an option is right comes in
 * on the action. That split keeps the rules testable without rendering anything.
 */

const REFLECTION_MIN = 50;
const REFLECTION_MAX = 500;
export const REFLECTION_LIMITS = { min: REFLECTION_MIN, max: REFLECTION_MAX } as const;

const freshAreas = (): Record<AreaId, AreaProgress> =>
  Object.fromEntries(AREA_IDS.map((id) => [id, { secured: false, fragment: 'none' }])) as Record<
    AreaId,
    AreaProgress
  >;

export const initialState: GameState = {
  phase: 'loading',
  round: 1,
  failures: 0,
  areas: freshAreas(),
  currentArea: null,
  step: 'intro',
  explored: [],
  selected: null,
  areaOpenedAt: null,
  decisions: [],
  evaluation: { reflection: null, dlpAnswer: null },
  seed: 1,
  startedAt: null,
  finishedAt: null,
};

/** Areas still to be played this round: not secured, and no fragment yet. */
export function pendingAreas(state: GameState): AreaId[] {
  return AREA_IDS.filter((id) => !state.areas[id].secured && state.areas[id].fragment === 'none');
}

/** Areas in play this round, secured ones excluded. */
export function roundAreas(state: GameState): AreaId[] {
  return AREA_IDS.filter((id) => !state.areas[id].secured);
}

export function roundComplete(state: GameState): boolean {
  return pendingAreas(state).length === 0;
}

/** What the console reveals: secured areas count as genuine. */
export function verification(state: GameState): Record<AreaId, 'genuine' | 'false'> {
  return Object.fromEntries(
    AREA_IDS.map((id) => {
      const a = state.areas[id];
      return [id, a.secured || a.fragment === 'genuine' ? 'genuine' : 'false'];
    }),
  ) as Record<AreaId, 'genuine' | 'false'>;
}

/** Areas whose fragment turned out false in the round that just ended. */
export function falseAreas(state: GameState): AreaId[] {
  return AREA_IDS.filter((id) => !state.areas[id].secured && state.areas[id].fragment === 'false');
}

export function securedCount(state: GameState): number {
  return AREA_IDS.filter((id) => state.areas[id].secured).length;
}

/**
 * Fragments in the player's hands, genuine or not. This is what the HUD shows
 * during a round — it has to look like progress even when it is not.
 */
export function heldCount(state: GameState): number {
  return AREA_IDS.filter((id) => state.areas[id].secured || state.areas[id].fragment !== 'none').length;
}

export function reflectionValid(text: string): boolean {
  const length = text.trim().length;
  return length >= REFLECTION_MIN && length <= REFLECTION_MAX;
}

export function canCertify(state: GameState): boolean {
  return (
    securedCount(state) === AREA_IDS.length &&
    state.failures < MAX_FAILURES &&
    state.evaluation.reflection !== null &&
    state.evaluation.dlpAnswer === false
  );
}

export function score(state: GameState): number {
  return canCertify(state) ? 100 : 0;
}

/** The decision the player made for an area in a given cycle, if any. */
export function decisionFor(state: GameState, area: AreaId, cycle: Cycle) {
  return state.decisions.find((d) => d.area === area && d.cycle === cycle) ?? null;
}

/**
 * The order the three options are shown in for one area and cycle. The script
 * always lists the right answer first, so without this "always pick A" would
 * win. Seeded per run so a resumed game shows the same order.
 */
export function optionOrder(seed: number, area: AreaId, cycle: Cycle): OptionId[] {
  let h = (seed ^ Math.imul(AREA_IDS.indexOf(area) + 1, 0x9e3779b1) ^ Math.imul(cycle, 0x85ebca6b)) >>> 0;
  const next = () => {
    // mulberry32: small, deterministic, and well mixed even for tiny seeds.
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [...OPTION_IDS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'loaded':
      if (state.phase !== 'loading') return state;
      return { ...state, phase: 'intro', startedAt: action.now, seed: action.seed };

    case 'introDone':
      return state.phase === 'intro' ? { ...state, phase: 'rules' } : state;

    case 'rulesDone':
      return state.phase === 'rules' ? { ...state, phase: 'areaSelect' } : state;

    case 'openArea':
      if (state.phase !== 'areaSelect' || !pendingAreas(state).includes(action.area)) return state;
      return {
        ...state,
        phase: 'area',
        currentArea: action.area,
        step: 'intro',
        explored: [],
        selected: null,
        areaOpenedAt: action.now,
      };

    case 'beginExplore':
      return state.phase === 'area' && state.step === 'intro' ? { ...state, step: 'explore' } : state;

    case 'exploreHotspot':
      if (state.phase !== 'area' || state.step !== 'explore') return state;
      if (state.explored.includes(action.hotspot)) return state;
      return { ...state, explored: [...state.explored, action.hotspot] };

    case 'goToDecision':
      return state.phase === 'area' && state.step === 'explore' ? { ...state, step: 'decision' } : state;

    case 'backToExplore':
      return state.phase === 'area' && state.step === 'decision' ? { ...state, step: 'explore' } : state;

    case 'selectOption':
      if (state.phase !== 'area' || state.step !== 'decision') return state;
      return { ...state, selected: action.option };

    case 'submitDecision': {
      const area = state.currentArea;
      if (state.phase !== 'area' || state.step !== 'decision' || !area || !state.selected) return state;
      return {
        ...state,
        step: 'fragment',
        areas: {
          ...state.areas,
          [area]: { secured: false, fragment: action.isCorrect ? 'genuine' : 'false' },
        },
        decisions: [
          ...state.decisions,
          {
            area,
            cycle: state.round,
            option: state.selected,
            correct: action.isCorrect,
            ms: Math.max(0, action.now - (state.areaOpenedAt ?? action.now)),
          },
        ],
      };
    }

    case 'continueFromFragment':
      if (state.phase !== 'area' || state.step !== 'fragment') return state;
      return {
        ...state,
        phase: roundComplete(state) ? 'console' : 'areaSelect',
        currentArea: null,
        step: 'intro',
        explored: [],
        selected: null,
        areaOpenedAt: null,
      };

    case 'consoleDone': {
      if (state.phase !== 'console') return state;
      // Every genuine fragment is locked in, whatever happens to the rest.
      const areas = { ...state.areas };
      for (const id of AREA_IDS) {
        if (areas[id].fragment === 'genuine') areas[id] = { secured: true, fragment: 'genuine' };
      }
      if (AREA_IDS.every((id) => areas[id].secured)) {
        return { ...state, areas, phase: 'debrief' };
      }
      const failures = state.failures + 1;
      return { ...state, areas, failures, phase: failures >= MAX_FAILURES ? 'gameOver' : 'roundEnd' };
    }

    case 'nextRound': {
      if (state.phase !== 'roundEnd' || state.round === 3) return state;
      const areas = { ...state.areas };
      for (const id of AREA_IDS) {
        if (!areas[id].secured) areas[id] = { secured: false, fragment: 'none' };
      }
      return { ...state, areas, round: (state.round + 1) as Cycle, phase: 'areaSelect' };
    }

    case 'debriefDone':
      return state.phase === 'debrief' ? { ...state, phase: 'evaluation' } : state;

    case 'submitReflection':
      if (state.phase !== 'evaluation' || !reflectionValid(action.text)) return state;
      return { ...state, evaluation: { ...state.evaluation, reflection: action.text.trim() } };

    case 'skipReflection':
      if (state.phase !== 'evaluation') return state;
      return { ...state, evaluation: { ...state.evaluation, reflection: '' } };

    case 'answerDlp': {
      if (state.phase !== 'evaluation' || state.evaluation.reflection === null) return state;
      const next = { ...state, evaluation: { ...state.evaluation, dlpAnswer: action.answer } };
      // "True" gets the explanation and another go; only the right answer moves on.
      return action.answer === false ? { ...next, phase: 'certificate' } : next;
    }

    case 'finish':
      return state.phase === 'certificate' && state.finishedAt == null
        ? { ...state, finishedAt: action.now }
        : state;

    case 'restart':
      return { ...initialState, areas: freshAreas(), phase: 'areaSelect', startedAt: action.now, seed: action.seed };

    case 'resume':
      return action.state;

    default:
      return state;
  }
}
