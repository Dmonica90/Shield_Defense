import type { AreaId } from './game/types';

/**
 * Where the hotspots sit on each area's illustrated scene (`components/SceneArt.tsx`),
 * as percentages of a 16:9 stage. Hotspot N in the script takes slot N, so a
 * cycle with five hotspots uses all five; one with three uses the first three.
 * Each slot sits on a drawn object, noted alongside it.
 */
export type Point = { left: string; top: string };

export const HOTSPOT_SLOTS: Record<AreaId, Point[]> = {
  atencion: [
    { left: '36%', top: '32%' }, // chat on the monitor
    { left: '66%', top: '74%' }, // notebook
    { left: '16%', top: '70%' }, // desk phone
    { left: '66%', top: '28%' }, // customer record
    { left: '8%', top: '54%' }, // sticky notes
  ],
  desarrollo: [
    { left: '36%', top: '32%' }, // Slack
    { left: '16%', top: '66%' }, // laptop on café Wi-Fi
    { left: '62%', top: '38%' }, // Gmail draft with the report
    { left: '85%', top: '74%' }, // protocol notebook
    { left: '70%', top: '74%' }, // phone
  ],
  finanzas: [
    { left: '31%', top: '30%' }, // dashboard
    { left: '16%', top: '66%' }, // personal laptop
    { left: '83%', top: '74%' }, // signatures folder
    { left: '65%', top: '28%' }, // pending transfer
    { left: '80%', top: '16%' }, // window
  ],
  operaciones: [
    { left: '52%', top: '20%' }, // alert screen
    { left: '66%', top: '76%' }, // phone
    { left: '75%', top: '24%' }, // logs screen
    { left: '34%', top: '58%' }, // terminal
    { left: '30%', top: '24%' }, // graph screen
  ],
};
