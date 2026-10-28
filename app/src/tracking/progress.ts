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

/** Whether this state is worth checkpointing; anything else clears the save. */
export function isResumable(state: GameState): boolean {
  return RESUMABLE.has(state.phase);
}

export function saveProgress(state: GameState): void {
  try {
    if (isResumable(state)) localStorage.setItem(KEY, JSON.stringify(state));
    else if (state.phase !== 'loading') localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked (private mode, site data off). The game still works.
  }
}

export function loadProgress(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** A saved checkpoint from any source (localStorage, `cmi.suspend_data`), if it is usable. */
export function parseProgress(value: unknown): GameState | null {
  return isGameState(value) ? value : null;
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
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
