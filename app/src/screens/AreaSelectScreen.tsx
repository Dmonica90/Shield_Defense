import { Fragment } from '../components/Fragment';
import { Hud, hudLook } from '../components/Hud';
import { Scene, Stagger, StaggerItem } from '../components/ui';
import { fill } from '../content/schema';
import { pendingAreas } from '../game/machine';
import { AREA_IDS } from '../game/types';
import type { AreaId, GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * The four areas, playable in any order. A played area shows "fragment
 * obtained" whether the fragment is real or not; only secured areas — verified
 * in an earlier round — are marked as such.
 */
export function AreaSelectScreen({ state, onOpen }: { state: GameState; onOpen: (area: AreaId) => void }) {
  const { story } = useLanguage();
  const pending = pendingAreas(state);

  const status = (area: AreaId) => {
    const a = state.areas[area];
    if (a.secured) return { text: story.areaSelect.secured, tone: 'text-safe' };
    if (a.fragment !== 'none') return { text: story.areaSelect.held, tone: 'text-accent' };
    return { text: story.areaSelect.pending, tone: 'text-warn' };
  };

  return (
    <Scene>
      <Hud state={state} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-6">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">{story.areaSelect.label}</p>
          <h1 className="mt-2 text-3xl font-bold">{story.areaSelect.title}</h1>
          <p className="mt-2 text-ink-dim">
            {state.round > 1 ? fill(story.areaSelect.roundHint, { round: state.round }) : story.areaSelect.hint}
          </p>
        </div>

        <Stagger as="ul" className="grid gap-4 md:grid-cols-2">
          {AREA_IDS.map((area, i) => {
            const content = story.areas[area];
            const open = pending.includes(area);
            const s = status(area);
            return (
              <StaggerItem as="li" key={area}>
                <button
                  type="button"
                  onClick={() => onOpen(area)}
                  disabled={!open}
                  aria-label={`${i + 1}. ${content.name}: ${content.title}. ${s.text}`}
                  className={`panel flex h-full w-full items-start gap-4 rounded-2xl p-5 text-left transition-colors ${
                    open ? 'hover:border-accent/70' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <Fragment area={area} look={hudLook(state, area)} />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="font-mono text-xs text-ink-dim">
                      [{i + 1}] {content.name.toUpperCase()} · {story.areaSelect.time}
                    </span>
                    <span className="text-lg font-semibold">{content.title}</span>
                    <span className={`font-mono text-xs ${s.tone}`}>● {s.text}</span>
                  </span>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Scene>
  );
}
