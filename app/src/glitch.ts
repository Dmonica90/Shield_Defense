import { useReducedMotion } from 'framer-motion';
import type { Cycle } from './game/types';
import { IS_FAST } from './timing';

/**
 * The interface degrades as the rounds get harder: faint static on the easy
 * round, rolling interference on the medium one, properly broken on the hard
 * one (see `index.css` and `MatrixRain`). Reduced motion and the test mode keep
 * the look but stop anything from moving.
 */
export function useGlitch(round: Cycle): string {
  const reduce = useReducedMotion();
  const level = { 1: '', 2: 'glitch-light', 3: 'glitch-heavy' }[round];
  if (!level) return '';
  return reduce || IS_FAST ? `${level} glitch-still` : level;
}
