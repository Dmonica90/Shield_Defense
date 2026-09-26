import { AREA_IDS } from '../game/types';
import { LEVEL_BY_CYCLE } from '../game/types';
import type { AreaId, Cycle, GameAction, GameState, Level, OptionId } from '../game/types';
import { canCertify, score } from '../game/machine';

/**
 * The tracking events from the design document, as data. They are derived from
 * reducer transitions (previous state, action, next state), so the game logic
 * never has to know that anything is listening — and the SCORM adapter that
 * comes later only has to map these onto `cmi.*`.
 */
export type TrackingEvent =
  | { name: 'course_launched'; at: number }
  | { name: 'content_viewed'; content: 'intro' | 'rules'; action: 'viewed' | 'skipped' }
  | { name: 'round_started'; round: Cycle; level: Level }
  | { name: 'area_started'; area: AreaId; cycle: Cycle }
  | { name: 'hotspot_explored'; area: AreaId; cycle: Cycle; hotspot: string }
  | {
      name: 'decision_submitted';
      area: AreaId;
      cycle: Cycle;
      option: OptionId;
      correct: boolean;
      seconds: number;
    }
  | { name: 'console_viewed'; round: Cycle }
  | { name: 'fragment_verified'; area: AreaId; cycle: Cycle; genuine: boolean }
  | { name: 'failure_recorded'; failures: number; round: Cycle; areas: AreaId[] }
  | { name: 'game_over'; failures: number; secured: number }
  | { name: 'debrief_viewed' }
  | { name: 'evaluation_submitted'; question: 1; answer: 'text' | 'skipped' }
  | { name: 'evaluation_submitted'; question: 2; answer: boolean; correct: boolean }
  | { name: 'course_completed'; score: number; passed: boolean; seconds: number }
  | { name: 'run_restarted' };

export function eventsFor(prev: GameState, action: GameAction, next: GameState): TrackingEvent[] {
  // Rejected actions (the reducer returned the same state) are not events.
  if (prev === next) return [];

  switch (action.type) {
    case 'loaded':
      return [{ name: 'course_launched', at: action.now }];

    case 'introDone':
      return [{ name: 'content_viewed', content: 'intro', action: 'viewed' }];

    case 'rulesDone':
      return [
        { name: 'content_viewed', content: 'rules', action: action.skipped ? 'skipped' : 'viewed' },
        { name: 'round_started', round: next.round, level: LEVEL_BY_CYCLE[next.round] },
      ];

    case 'openArea':
      return [{ name: 'area_started', area: action.area, cycle: next.round }];

    case 'exploreHotspot':
      return next.currentArea
        ? [{ name: 'hotspot_explored', area: next.currentArea, cycle: next.round, hotspot: action.hotspot }]
        : [];

    case 'submitDecision': {
      const d = next.decisions.at(-1);
      return d
        ? [
            {
              name: 'decision_submitted',
              area: d.area,
              cycle: d.cycle,
              option: d.option,
              correct: d.correct,
              seconds: Math.round(d.ms / 1000),
            },
          ]
        : [];
    }

    case 'continueFromFragment':
      return next.phase === 'console' ? [{ name: 'console_viewed', round: next.round }] : [];

    case 'consoleDone': {
      // Only the areas played this round get verified; secured ones already were.
      const played = AREA_IDS.filter((id) => !prev.areas[id].secured);
      const events: TrackingEvent[] = played.map((area) => ({
        name: 'fragment_verified',
        area,
        cycle: prev.round,
        genuine: prev.areas[area].fragment === 'genuine',
      }));
      if (next.failures > prev.failures) {
        events.push({
          name: 'failure_recorded',
          failures: next.failures,
          round: prev.round,
          areas: played.filter((area) => prev.areas[area].fragment === 'false'),
        });
      }
      if (next.phase === 'gameOver') {
        events.push({
          name: 'game_over',
          failures: next.failures,
          secured: AREA_IDS.filter((id) => next.areas[id].secured).length,
        });
      }
      return events;
    }

    case 'nextRound':
      return [{ name: 'round_started', round: next.round, level: LEVEL_BY_CYCLE[next.round] }];

    case 'debriefDone':
      return [{ name: 'debrief_viewed' }];

    case 'submitReflection':
      return [{ name: 'evaluation_submitted', question: 1, answer: 'text' }];

    case 'skipReflection':
      return [{ name: 'evaluation_submitted', question: 1, answer: 'skipped' }];

    case 'answerDlp':
      return [{ name: 'evaluation_submitted', question: 2, answer: action.answer, correct: action.answer === false }];

    case 'finish':
      return [
        {
          name: 'course_completed',
          score: score(next),
          passed: canCertify(next),
          seconds: Math.round(((next.finishedAt ?? action.now) - (next.startedAt ?? action.now)) / 1000),
        },
      ];

    case 'restart':
      return [
        { name: 'run_restarted' },
        { name: 'round_started', round: next.round, level: LEVEL_BY_CYCLE[next.round] },
      ];

    default:
      return [];
  }
}
