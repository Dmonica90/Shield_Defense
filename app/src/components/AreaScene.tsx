import { motion } from 'framer-motion';
import type { Hotspot } from '../content/schema';
import type { AreaId } from '../game/types';
import { HOTSPOT_SLOTS } from '../scene';
import { ART } from './SceneArt';

/**
 * The area's scene with its hotspots. Every screen shows the illustrated room.
 * Wide ones put a labelled marker on each point of interest; narrow ones put a
 * small numbered marker there and repeat the hotspots, with the same numbers,
 * as a stacked list underneath — on a phone the 16:9 stage is too small for
 * labels, and the list is the tap target screen readers and the tests use.
 */
export function AreaScene({
  area,
  hotspots,
  explored,
  onOpen,
  exploredLabel,
}: {
  area: AreaId;
  hotspots: Hotspot[];
  explored: string[];
  onOpen: (hotspot: Hotspot) => void;
  exploredLabel: string;
}) {
  const slots = HOTSPOT_SLOTS[area];

  return (
    <>
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-edge"
        // Capped by height too, so the scene and the Decide button both fit a 720px screen.
        style={{ aspectRatio: '16 / 9', maxWidth: 'min(100%, calc((100dvh - 330px) * 16 / 9))' }}
      >
        <svg viewBox="0 0 1600 900" className="glitch-slice absolute inset-0 h-full w-full" aria-hidden="true">
          {ART[area]}
        </svg>
        <div className="scanlines absolute inset-0 opacity-25" aria-hidden="true" />

        {hotspots.map((hotspot, i) => {
          const seen = explored.includes(hotspot.id);
          return (
            <motion.div
              key={hotspot.id}
              className="glitch-jump absolute -translate-x-1/2 -translate-y-1/2"
              style={slots[i]}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
            >
              <div className="hidden lg:block">
                <HotspotButton hotspot={hotspot} seen={seen} onOpen={onOpen} exploredLabel={exploredLabel} />
              </div>
              <NumberMarker number={i + 1} seen={seen} onOpen={() => onOpen(hotspot)} />
            </motion.div>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2 lg:hidden">
        {hotspots.map((hotspot, i) => (
          <li key={hotspot.id}>
            <HotspotButton
              number={i + 1}
              hotspot={hotspot}
              seen={explored.includes(hotspot.id)}
              onOpen={onOpen}
              exploredLabel={exploredLabel}
              stacked
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The phone-sized marker on the drawing: just the hotspot's number. It is a
 * shortcut for touch only — hidden from screen readers and the tab order,
 * since the numbered list below carries the same hotspots with their names.
 */
function NumberMarker({ number, seen, onOpen }: { number: number; seen: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} tabIndex={-1} aria-hidden="true" className="relative grid place-items-center lg:hidden">
      {!seen && <span className="absolute h-9 w-9 animate-ping rounded-full bg-accent/25" />}
      <span
        className={`relative grid h-7 w-7 place-items-center rounded-full border-2 font-mono text-xs font-bold ${
          seen ? 'border-safe/70 bg-panel/90 text-safe' : 'border-accent bg-panel/90 text-accent shadow-[0_0_16px_-4px_var(--color-accent)]'
        }`}
      >
        {seen ? '✓' : number}
      </span>
    </button>
  );
}

function HotspotButton({
  hotspot,
  seen,
  onOpen,
  exploredLabel,
  stacked = false,
  number,
}: {
  hotspot: Hotspot;
  seen: boolean;
  onOpen: (hotspot: Hotspot) => void;
  exploredLabel: string;
  stacked?: boolean;
  /** Shown in the stacked list so each row matches its marker on the drawing. */
  number?: number;
}) {
  const name = seen ? `${hotspot.label} (${exploredLabel})` : hotspot.label;

  if (stacked) {
    return (
      <button
        type="button"
        onClick={() => onOpen(hotspot)}
        aria-label={name}
        className={`panel flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${seen ? 'opacity-70' : ''}`}
      >
        {number !== undefined && (
          <span
            aria-hidden="true"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 font-mono text-xs font-bold ${
              seen ? 'border-safe/70 text-safe' : 'border-accent text-accent'
            }`}
          >
            {number}
          </span>
        )}
        <span aria-hidden="true" className="text-2xl">{hotspot.icon}</span>
        <span className="flex-1">{hotspot.label}</span>
        <span aria-hidden="true" className={seen ? 'text-safe' : 'text-accent'}>{seen ? '✓' : '＋'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(hotspot)}
      aria-label={name}
      className="group flex flex-col items-center gap-1"
    >
      <span className="relative grid place-items-center">
        {!seen && <span aria-hidden="true" className="absolute h-16 w-16 animate-ping rounded-full bg-accent/25" />}
        <span
          aria-hidden="true"
          className={`relative grid h-14 w-14 place-items-center rounded-full border-2 text-2xl transition-transform group-hover:scale-110 ${
            seen ? 'border-safe/70 bg-panel/90' : 'border-accent bg-panel/90 shadow-[0_0_24px_-4px_var(--color-accent)]'
          }`}
        >
          {hotspot.icon}
        </span>
      </span>
      <span aria-hidden="true" className="rounded-md bg-ground/80 px-2 py-0.5 text-xs text-ink">
        {seen ? '✓ ' : ''}
        {hotspot.label}
      </span>
    </button>
  );
}
