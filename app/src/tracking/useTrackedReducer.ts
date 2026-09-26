import { useCallback, useRef, useState } from 'react';
import { reducer } from '../game/machine';
import type { GameAction, GameState } from '../game/types';
import { eventsFor } from './events';
import { saveProgress } from './progress';
import type { Reporter } from './reporter';

/**
 * `useReducer`, plus the side effects the game owes the outside world: every
 * accepted action is checkpointed and turned into tracking events. Doing it
 * here, rather than in the reducer, keeps the rules pure.
 */
export function useTrackedReducer(initial: GameState, reporter: Reporter) {
  const [state, setState] = useState(initial);
  const ref = useRef(initial);

  const dispatch = useCallback(
    (action: GameAction) => {
      const prev = ref.current;
      const next = reducer(prev, action);
      if (next === prev) return;
      ref.current = next;
      setState(next);

      for (const event of eventsFor(prev, action, next)) {
        reporter.event(event);
        if (event.name === 'course_completed') {
          reporter.complete({ score: event.score, passed: event.passed, seconds: event.seconds });
        }
      }
      saveProgress(next);
      reporter.saveProgress(next);
    },
    [reporter],
  );

  return [state, dispatch] as const;
}
