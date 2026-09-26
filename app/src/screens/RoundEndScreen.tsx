import { Fragment } from '../components/Fragment';
import { Hud } from '../components/Hud';
import { Button, Scene, Stagger, StaggerItem } from '../components/ui';
import { cycleContent, fill } from '../content/schema';
import { decisionFor, falseAreas } from '../game/machine';
import { LEVEL_BY_CYCLE, MAX_FAILURES } from '../game/types';
import type { Cycle, GameState } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * After a failed verification. This is the only place the consequences of a
 * wrong decision are shown: what the player chose, what it led to, and why.
 */
export function RoundEndScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const { story } = useLanguage();
  const failed = falseAreas(state);
  const nextRound = Math.min(state.round + 1, 3) as Cycle;

  return (
    <Scene>
      <Hud state={state} />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-alarm uppercase">{story.roundEnd.label}</p>
          <h1 className="mt-2 text-3xl font-bold">{story.roundEnd.title}</h1>
          <p className="mt-2 font-mono text-alarm">
            {fill(story.roundEnd.failures, { failures: state.failures, max: MAX_FAILURES })}
          </p>
          <p className="mt-3 text-ink-dim">{story.roundEnd.body}</p>
        </div>

        <Stagger as="ul" className="flex flex-col gap-4">
          {failed.map((area) => {
            const content = story.areas[area];
            const decision = decisionFor(state, area, state.round);
            const option = decision ? cycleContent(story, area, state.round).options[decision.option] : null;
            return (
              <StaggerItem as="li" key={area} className="panel rounded-2xl border-alarm/40! p-5">
                <div className="flex items-center gap-3">
                  <Fragment area={area} look="false" size="sm" label={false} />
                  <h2 className="text-lg font-semibold">
                    {content.name}: {content.title}
                  </h2>
                </div>
                {option && (
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-mono text-xs tracking-widest text-ink-dim uppercase">{story.roundEnd.youChose}</dt>
                      <dd className="mt-1 border-l-2 border-edge pl-3 text-base italic">{option.text}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-xs tracking-widest text-alarm uppercase">{story.roundEnd.consequences}</dt>
                      <dd>
                        <ul className="mt-1 flex flex-col gap-1">
                          {option.consequences.map((c) => (
                            <li key={c} className="flex gap-2">
                              <span aria-hidden="true" className="text-alarm">→</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-xs tracking-widest text-accent uppercase">{story.roundEnd.why}</dt>
                      <dd className="mt-1">{option.why}</dd>
                    </div>
                  </dl>
                )}
              </StaggerItem>
            );
          })}
        </Stagger>

        <p className="text-ink-dim">
          {fill(story.roundEnd.next, { round: nextRound, level: story.levels[LEVEL_BY_CYCLE[nextRound]].name })}
        </p>
        <div className="flex justify-end">
          <Button onClick={onNext}>{story.roundEnd.cta}</Button>
        </div>
      </div>
    </Scene>
  );
}
