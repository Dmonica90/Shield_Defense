import { initialState } from '../game/machine';
import { AREA_IDS } from '../game/types';
import type { GameState } from '../game/types';

/**
 * The checkpoint kept in the browser so a closed tab or a reload can pick up
 * where the player left off. Once SCORM is wired in, the same snapshot goes to
 * `cmi.suspend_data` as well.
 */
const KEY = 'clip-shield-defense:progress:v1';

/** Phases worth resuming into. Before the first area there is nothing to lose. */
const RESUMABLE = new Set<GameState['phase']>([
  'areaSelect',
  'area',
  'console',
  'roundEnd',
  'debrief',
  'evaluation',
]);

export function saveProgress(state: GameState): void {
  try {
    if (RESUMABLE.has(state.phase)) localStorage.setItem(KEY, JSON.stringify(state));
    else if (state.phase !== 'loading') localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked (private mode, site data off). The game still works.
  }
}

export function loadProgress(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return parseProgress(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** A saved run read back from anywhere (the browser or an LMS), or null if it is not one. */
export function parseProgress(value: unknown): GameState | null {
  return isGameState(value) ? value : null;
}

/** Whether a phase is worth saving: before the first area there is nothing to lose. */
export function isResumable(phase: GameState['phase']): boolean {
  return RESUMABLE.has(phase);
}

/** A loose shape check, so a stale or hand-edited save cannot crash the game. */
function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<GameState>;
  return (
    typeof s.phase === 'string' &&
    RESUMABLE.has(s.phase) &&
    (s.round === 1 || s.round === 2 || s.round === 3) &&
    typeof s.failures === 'number' &&
    !!s.areas &&
    AREA_IDS.every((id) => typeof s.areas?.[id]?.secured === 'boolean') &&
    Array.isArray(s.decisions) &&
    Object.keys(initialState).every((key) => key in s)
  );
}
