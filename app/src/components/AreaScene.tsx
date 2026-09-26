import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Hotspot } from '../content/schema';
import type { AreaId } from '../game/types';
import { HOTSPOT_SLOTS } from '../scene';

/**
 * Placeholder art for each area, drawn in SVG until Clip's illustrations exist.
 * Each one is a simple, recognisable room — a call-centre desk, a code editor,
 * an office, a wall of monitors — so the hotspots have something to sit on.
 */
const ART: Record<AreaId, ReactNode> = {
  atencion: (
    <>
      <rect x="0" y="620" width="1600" height="280" fill="#101827" />
      <rect x="260" y="200" width="620" height="380" rx="18" fill="#0d1526" stroke="#24304a" strokeWidth="6" />
      <rect x="300" y="250" width="380" height="54" rx="14" fill="#1d2a44" />
      <rect x="440" y="330" width="400" height="54" rx="14" fill="#38d8f0" opacity="0.35" />
      <rect x="300" y="410" width="300" height="54" rx="14" fill="#ff5470" opacity="0.45" />
      <rect x="540" y="580" width="60" height="60" fill="#24304a" />
      <rect x="880" y="480" width="360" height="200" rx="16" fill="#f3efe6" opacity="0.12" />
      <path d="M920 520h280M920 560h240M920 600h260" stroke="#e8ecf7" strokeOpacity="0.25" strokeWidth="10" strokeLinecap="round" />
      <rect x="1180" y="300" width="160" height="240" rx="30" fill="#161d2e" stroke="#ff6a13" strokeWidth="6" />
      <circle cx="1260" cy="500" r="18" fill="#ff6a13" />
    </>
  ),
  desarrollo: (
    <>
      <rect x="120" y="120" width="760" height="560" rx="18" fill="#0b1220" stroke="#24304a" strokeWidth="6" />
      <rect x="120" y="120" width="760" height="50" rx="18" fill="#161d2e" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={170 + (i % 3) * 30} y={210 + i * 60} width={260 + ((i * 97) % 300)} height="22" rx="8" fill={i === 3 ? '#ff5470' : '#38d8f0'} opacity={i === 3 ? 0.6 : 0.3} />
      ))}
      <rect x="960" y="140" width="520" height="420" rx="18" fill="#1a1230" stroke="#8b6cf0" strokeWidth="6" />
      <rect x="1000" y="200" width="300" height="46" rx="12" fill="#8b6cf0" opacity="0.4" />
      <rect x="1080" y="270" width="360" height="46" rx="12" fill="#8b6cf0" opacity="0.25" />
      <rect x="1000" y="340" width="260" height="46" rx="12" fill="#8b6cf0" opacity="0.4" />
      <rect x="960" y="600" width="520" height="160" rx="18" fill="#101827" stroke="#24304a" strokeWidth="6" />
      <rect x="1000" y="650" width="180" height="70" rx="10" fill="#ffb547" opacity="0.5" />
    </>
  ),
  finanzas: (
    <>
      <rect x="0" y="640" width="1600" height="260" fill="#111a2b" />
      <rect x="160" y="140" width="520" height="340" rx="16" fill="#0d1526" stroke="#24304a" strokeWidth="6" />
      <path d="M210 420l90-90 80 50 110-130 120 70" stroke="#3ddc97" strokeWidth="10" fill="none" />
      <rect x="720" y="470" width="420" height="200" rx="14" fill="#161d2e" stroke="#38d8f0" strokeWidth="5" />
      <rect x="760" y="510" width="340" height="120" rx="8" fill="#38d8f0" opacity="0.2" />
      <rect x="1220" y="180" width="240" height="440" rx="14" fill="#1a2233" stroke="#ffb547" strokeWidth="6" />
      <circle cx="1340" cy="400" r="54" fill="none" stroke="#ffb547" strokeWidth="10" />
      <rect x="360" y="560" width="260" height="120" rx="10" fill="#f3efe6" opacity="0.12" />
    </>
  ),
  operaciones: (
    <>
      {[0, 1, 2].map((col) =>
        [0, 1].map((row) => (
          <rect key={`${col}-${row}`} x={140 + col * 460} y={110 + row * 290} width="420" height="250" rx="14" fill="#0b1220" stroke={col === 1 && row === 0 ? '#ff5470' : '#24304a'} strokeWidth="6" />
        )),
      )}
      <path d="M180 300l80-60 70 40 90-90 90 70" stroke="#38d8f0" strokeWidth="8" fill="none" />
      <path d="M640 280l60-110 60 150 60-80 80 40" stroke="#ff5470" strokeWidth="9" fill="none" />
      <rect x="1100" y="160" width="340" height="30" rx="8" fill="#3ddc97" opacity="0.4" />
      <rect x="1100" y="210" width="260" height="30" rx="8" fill="#3ddc97" opacity="0.25" />
      <rect x="180" y="460" width="330" height="26" rx="8" fill="#ffb547" opacity="0.35" />
      <rect x="640" y="460" width="300" height="130" rx="10" fill="#ff5470" opacity="0.18" />
      <rect x="0" y="720" width="1600" height="180" fill="#101827" />
    </>
  ),
};

/**
 * The area's scene with its hotspots. Wide screens get the drawn room with a
 * marker on each point of interest; narrow ones get the same hotspots as a
 * stacked list, since a 16:9 stage on a phone is too small to tap reliably.
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
        className="relative mx-auto hidden w-full overflow-hidden rounded-2xl border border-edge lg:block"
        // Capped by height too, so the scene and the Decide button both fit a 720px screen.
        style={{ aspectRatio: '16 / 9', maxWidth: 'min(100%, calc((100dvh - 330px) * 16 / 9))' }}
      >
        <svg viewBox="0 0 1600 900" className="glitch-slice absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id={`glow-${area}`} cx="50%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#1b2a48" />
              <stop offset="100%" stopColor="#07090f" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#glow-${area})`} />
          {ART[area]}
        </svg>
        <div className="scanlines absolute inset-0 opacity-60" aria-hidden="true" />

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
              <HotspotButton hotspot={hotspot} seen={seen} onOpen={onOpen} exploredLabel={exploredLabel} />
            </motion.div>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2 lg:hidden">
        {hotspots.map((hotspot) => (
          <li key={hotspot.id}>
            <HotspotButton
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

function HotspotButton({
  hotspot,
  seen,
  onOpen,
  exploredLabel,
  stacked = false,
}: {
  hotspot: Hotspot;
  seen: boolean;
  onOpen: (hotspot: Hotspot) => void;
  exploredLabel: string;
  stacked?: boolean;
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
