export const AREA_IDS = ['atencion', 'desarrollo', 'finanzas', 'operaciones'] as const;
export type AreaId = (typeof AREA_IDS)[number];

/**
 * A round is one pass over the areas still open. Round N is played at cycle N,
 * and the cycle is also the difficulty: 1 = easy, 2 = medium, 3 = hard.
 */
export type Cycle = 1 | 2 | 3;
export const LEVEL_BY_CYCLE = { 1: 'easy', 2: 'medium', 3: 'hard' } as const;
export type Level = (typeof LEVEL_BY_CYCLE)[Cycle];

export const OPTION_IDS = ['A', 'B', 'C'] as const;
export type OptionId = (typeof OPTION_IDS)[number];

/** Three rounds that end with a false fragment and the attack gets through. */
export const MAX_FAILURES = 3;

export type Phase =
  | 'loading'
  | 'intro'
  | 'rules'
  | 'areaSelect'
  | 'area'
  | 'console'
  | 'roundEnd'
  | 'debrief'
  | 'evaluation'
  | 'certificate'
  | 'gameOver';

/** The beats inside one area. `fragment` looks the same whether the call was right or not. */
export type AreaStep = 'intro' | 'explore' | 'decision' | 'fragment';

/**
 * What the player holds for an area this round. Every decision hands over a
 * fragment; only the console, at the end of the round, tells a genuine one from
 * a false one. That is the "false security" the course is named after.
 */
export type FragmentState = 'none' | 'genuine' | 'false';

export type AreaProgress = {
  /** Verified by the console in an earlier round: closed for good. */
  secured: boolean;
  fragment: FragmentState;
};

export type Decision = {
  area: AreaId;
  cycle: Cycle;
  option: OptionId;
  correct: boolean;
  /** Time from opening the area to submitting, for the tracking payload. */
  ms: number;
};

export type GameState = {
  phase: Phase;
  round: Cycle;
  failures: number;
  areas: Record<AreaId, AreaProgress>;
  currentArea: AreaId | null;
  step: AreaStep;
  /** Hotspots opened in the current area, in the order they were opened. */
  explored: string[];
  selected: OptionId | null;
  /** When the current area was opened; decision latency is measured from here. */
  areaOpenedAt: number | null;
  decisions: Decision[];
  evaluation: {
    /** Null until answered; an empty string means the player skipped it. */
    reflection: string | null;
    /** The player's latest true/false answer to "the DLP spies on me". */
    dlpAnswer: boolean | null;
  };
  /** Seeds the per-run option order so the right answer is not always "A". */
  seed: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export type GameAction =
  | { type: 'loaded'; now: number; seed: number }
  | { type: 'introDone' }
  | { type: 'rulesDone'; skipped: boolean }
  | { type: 'openArea'; area: AreaId; now: number }
  | { type: 'beginExplore' }
  | { type: 'exploreHotspot'; hotspot: string }
  | { type: 'goToDecision' }
  | { type: 'backToExplore' }
  | { type: 'selectOption'; option: OptionId }
  /** `isCorrect` comes from the script, which the reducer deliberately never reads. */
  | { type: 'submitDecision'; now: number; isCorrect: boolean }
  | { type: 'continueFromFragment' }
  | { type: 'consoleDone' }
  | { type: 'nextRound' }
  | { type: 'debriefDone' }
  | { type: 'submitReflection'; text: string }
  | { type: 'skipReflection' }
  | { type: 'answerDlp'; answer: boolean }
  | { type: 'finish'; now: number }
  | { type: 'restart'; now: number; seed: number }
  | { type: 'resume'; state: GameState };
