import type { AreaId } from './game/types';

/**
 * Where the hotspots sit on each area's drawn scene, as percentages of a 16:9
 * stage. Hotspot N in the script takes slot N, so a cycle with five hotspots
 * uses all five; one with three uses the first three.
 */
export type Point = { left: string; top: string };

export const HOTSPOT_SLOTS: Record<AreaId, Point[]> = {
  atencion: [
    { left: '30%', top: '38%' },
    { left: '62%', top: '66%' },
    { left: '80%', top: '42%' },
    { left: '14%', top: '70%' },
    { left: '48%', top: '20%' },
  ],
  desarrollo: [
    { left: '22%', top: '34%' },
    { left: '52%', top: '48%' },
    { left: '80%', top: '32%' },
    { left: '70%', top: '74%' },
    { left: '26%', top: '74%' },
  ],
  finanzas: [
    { left: '24%', top: '32%' },
    { left: '56%', top: '56%' },
    { left: '82%', top: '30%' },
    { left: '38%', top: '76%' },
    { left: '78%', top: '72%' },
  ],
  operaciones: [
    { left: '20%', top: '40%' },
    { left: '50%', top: '28%' },
    { left: '80%', top: '40%' },
    { left: '34%', top: '74%' },
    { left: '68%', top: '72%' },
  ],
};
