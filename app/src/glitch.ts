import type { SceneFx } from './components/ui';
import type { Cycle } from './game/types';

/**
 * The system leaks harder as the rounds get harder: clean on the easy round;
 * on the medium one the signal breaks up and then a light binary rain sets in;
 * on the hard one a dense rain with the signal breaking up every few seconds.
 * The effects themselves hold still under reduced motion and the test mode.
 */
export function useGlitch(round: Cycle): SceneFx | undefined {
  return ({ 1: undefined, 2: 'leak', 3: 'breach' } as const)[round];
}
