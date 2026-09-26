import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { AreaScene } from '../components/AreaScene';
import { Fragment } from '../components/Fragment';
import { Hud } from '../components/Hud';
import { Button, Dialog, Scene } from '../components/ui';
import { correctOption, cycleContent, fill } from '../content/schema';
import type { Hotspot } from '../content/schema';
import { optionOrder } from '../game/machine';
import { LEVEL_BY_CYCLE, OPTION_IDS } from '../game/types';
import type { AreaId, GameAction, GameState } from '../game/types';
import { useGlitch } from '../glitch';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * One area, in four beats: the situation, the scene to explore, the decision,
 * and the fragment. The last beat is identical for a right and a wrong answer —
 * nothing on this screen says which it was.
 */
export function AreaScreen({
  state,
  area,
  dispatch,
}: {
  state: GameState;
  area: AreaId;
  dispatch: (action: GameAction) => void;
}) {
  const { story } = useLanguage();
  const glitch = useGlitch(state.round);
  const content = story.areas[area];
  const cycle = cycleContent(story, area, state.round);
  const level = story.levels[LEVEL_BY_CYCLE[state.round]];

  return (
    <Scene className={glitch}>
      <Hud state={state} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 py-6">
        <header className="flex flex-wrap items-center gap-3">
          <Fragment area={area} look="empty" size="sm" label={false} />
          <p className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
            {content.name} · {level.name}
          </p>
          <p className="font-mono text-xs text-ink-dim">{content.setting}</p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {state.step === 'intro' && (
              <>
                <h1 className="text-3xl font-bold sm:text-4xl">{content.title}</h1>
                {cycle.twist && (
                  <p className="glitch-jump rounded-xl border border-alarm/60 bg-alarm/10 px-4 py-3 font-semibold text-alarm">
                    ⚡ {story.area.twist}: {cycle.twist}
                  </p>
                )}
                <p className="panel rounded-2xl p-5 text-lg leading-relaxed">{cycle.intro}</p>
                <div>
                  <h2 className="font-mono text-xs tracking-widest text-warn uppercase">{story.area.pressure}</h2>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {cycle.pressure.map((p) => (
                      <li key={p} className="rounded-full border border-warn/50 bg-warn/10 px-3 py-1 text-sm text-warn">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => dispatch({ type: 'beginExplore' })} className="glitch-jump">
                    {story.area.explore}
                  </Button>
                </div>
              </>
            )}

            {state.step === 'explore' && <Explore state={state} area={area} hotspots={cycle.hotspots} dispatch={dispatch} />}

            {state.step === 'decision' && <Decide state={state} area={area} dispatch={dispatch} />}

            {state.step === 'fragment' && (
              <div className="m-auto flex max-w-lg flex-col items-center gap-5 py-6 text-center">
                <motion.div
                  initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 14 }}
                >
                  <Fragment area={area} look="held" size="lg" />
                </motion.div>
                <h1 className="text-3xl font-bold">{story.area.fragmentTitle}</h1>
                <p className="text-ink-dim">
                  {fill(story.area.fragmentBody, { fragment: `${content.fragment.icon} ${content.fragment.name}` })}
                </p>
                <Button onClick={() => dispatch({ type: 'continueFromFragment' })}>{story.area.continue}</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Scene>
  );
}

function Explore({
  state,
  area,
  hotspots,
  dispatch,
}: {
  state: GameState;
  area: AreaId;
  hotspots: Hotspot[];
  dispatch: (action: GameAction) => void;
}) {
  const { story } = useLanguage();
  const [open, setOpen] = useState<Hotspot | null>(null);
  const done = hotspots.filter((h) => state.explored.includes(h.id)).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{story.area.exploreTitle}</h1>
          <p className="text-ink-dim">{story.area.exploreHint}</p>
        </div>
        <p className="font-mono text-xs text-accent" aria-live="polite">
          {fill(story.area.exploredCount, { done, total: hotspots.length })}
        </p>
      </div>

      <AreaScene
        area={area}
        hotspots={hotspots}
        explored={state.explored}
        exploredLabel="✓"
        onOpen={(hotspot) => {
          dispatch({ type: 'exploreHotspot', hotspot: hotspot.id });
          setOpen(hotspot);
        }}
      />

      <div className="flex justify-end">
        <Button onClick={() => dispatch({ type: 'goToDecision' })} className="glitch-jump">
          {story.area.decide}
        </Button>
      </div>

      <Dialog open={open != null} onClose={() => setOpen(null)} labelledBy="hotspot-title">
        {open && (
          <>
            <h2 id="hotspot-title" className="flex items-center gap-3 text-xl font-semibold">
              <span aria-hidden="true" className="text-3xl">{open.icon}</span>
              {open.label}
            </h2>
            <p className="mt-4 text-lg leading-relaxed">{open.text}</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setOpen(null)} sfx="click">
                {story.area.close}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}

function Decide({
  state,
  area,
  dispatch,
}: {
  state: GameState;
  area: AreaId;
  dispatch: (action: GameAction) => void;
}) {
  const { story } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const cycle = cycleContent(story, area, state.round);
  const order = optionOrder(state.seed, area, state.round);

  return (
    <>
      <h1 className="text-3xl font-bold">{cycle.question}</h1>
      <div role="radiogroup" aria-label={cycle.question} className="flex flex-col gap-3">
        {order.map((id, i) => {
          const selected = state.selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => dispatch({ type: 'selectOption', option: id })}
              className={`glitch-jump panel flex items-start gap-4 rounded-2xl p-5 text-left text-lg transition-colors ${
                selected ? 'border-accent! bg-accent/10' : 'hover:border-accent/60'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-mono font-bold ${
                  selected ? 'bg-accent text-ground' : 'bg-panel-2 text-ink-dim'
                }`}
              >
                {OPTION_IDS[i]}
              </span>
              <span>{cycle.options[id].text}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button tone="quiet" onClick={() => dispatch({ type: 'backToExplore' })}>
          {story.area.backToScene}
        </Button>
        <Button onClick={() => setConfirming(true)} disabled={!state.selected} className="glitch-jump">
          {story.area.submit}
        </Button>
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} labelledBy="confirm-title">
        <h2 id="confirm-title" className="text-xl font-semibold">
          {story.area.confirmTitle}
        </h2>
        <p className="mt-3 text-ink-dim">{story.area.confirmBody}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button tone="ghost" onClick={() => setConfirming(false)}>
            {story.area.confirmCancel}
          </Button>
          <Button
            sfx="confirm"
            onClick={() => {
              setConfirming(false);
              dispatch({ type: 'submitDecision', now: Date.now(), isCorrect: state.selected === correctOption(cycle) });
            }}
          >
            {story.area.confirmOk}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
