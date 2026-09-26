import { heldCount, securedCount } from '../game/machine';
import { AREA_IDS, LEVEL_BY_CYCLE, MAX_FAILURES } from '../game/types';
import type { AreaId, GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';
import { useSound } from '../audio/SoundProvider';
import { fill } from '../content/schema';
import { Fragment } from './Fragment';
import type { FragmentLook } from './Fragment';

/**
 * After the console has run, false fragments are no longer a secret: the HUD
 * shows them as such until the next round starts.
 */
const revealed = (state: GameState) => state.phase === 'roundEnd' || state.phase === 'gameOver';

/** How a fragment looks in the HUD: secured ones are proven, the rest only held. */
export function hudLook(state: GameState, area: AreaId): FragmentLook {
  const a = state.areas[area];
  if (a.secured) return 'genuine';
  if (a.fragment === 'false' && revealed(state)) return 'false';
  return a.fragment === 'none' ? 'empty' : 'held';
}

/**
 * The persistent status bar: round and level, fragments in hand, failures, and
 * sound. During a round it counts false fragments as held — the player finds
 * out at the console, not here.
 */
export function Hud({ state }: { state: GameState }) {
  const { story } = useLanguage();
  const { muted, toggleMuted } = useSound();
  const level = story.levels[LEVEL_BY_CYCLE[state.round]];
  const count = revealed(state) ? securedCount(state) : heldCount(state);

  return (
    <header className="no-print flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl panel px-4 py-3">
      <p className="font-mono text-xs tracking-[0.18em] text-clip uppercase">
        {story.meta.brand} · {story.meta.title}
      </p>

      <p className="font-mono text-xs text-accent tabular-nums">
        {fill(story.hud.round, { round: state.round })} · {level.name}
      </p>

      <div className="flex items-center gap-2" aria-label={`${story.hud.fragments}: ${count}/4`} role="group">
        <span className="font-mono text-xs text-ink-dim" aria-hidden="true">
          {story.hud.fragments} {count}/4
        </span>
        {AREA_IDS.map((area) => (
          <Fragment key={area} area={area} look={hudLook(state, area)} size="sm" label={false} />
        ))}
      </div>

      <div
        className="flex items-center gap-2"
        role="group"
        aria-label={`${story.hud.failures}: ${state.failures}/${MAX_FAILURES}`}
      >
        <span className="font-mono text-xs text-ink-dim" aria-hidden="true">
          {story.hud.failures} {state.failures}/{MAX_FAILURES}
        </span>
        {Array.from({ length: MAX_FAILURES }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${i < state.failures ? 'bg-alarm shadow-[0_0_10px_var(--color-alarm)]' : 'bg-panel-2 ring-1 ring-edge'}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={toggleMuted}
        aria-pressed={muted}
        aria-label={muted ? story.hud.unmute : story.hud.mute}
        className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-ink-dim hover:text-ink"
      >
        <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      </button>
    </header>
  );
}
