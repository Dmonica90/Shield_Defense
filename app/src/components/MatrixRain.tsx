import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { Cycle } from '../game/types';
import { IS_FAST } from '../timing';

/**
 * Falling glyphs behind the area screens, the system leaking through. They only
 * show up once the player has failed a round: absent on the first attempt,
 * steady on the second, a dense, fast curtain on the third. Reduced motion and
 * the test mode get one still frame.
 */
const LEVELS: Record<Cycle, { density: number; every: number; opacity: number } | null> = {
  1: null,
  2: { density: 0.55, every: 3, opacity: 0.18 },
  3: { density: 1, every: 2, opacity: 0.28 },
};

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0101010110';
const SIZE = 18;

export function MatrixRain({ round }: { round: Cycle }) {
  const level = LEVELS[round];
  return level ? <Rain {...level} /> : null;
}

function Rain({ density, every, opacity }: { density: number; every: number; opacity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#38d8f0';
    let drops: (number | null)[] = [];

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const rows = canvas.height / SIZE;
      drops = Array.from({ length: Math.ceil(canvas.width / SIZE) }, () => (Math.random() < density ? Math.random() * rows : null));
    };

    const step = () => {
      // Fade what is there instead of painting over it, so the page shows through.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.font = `${SIZE}px ui-monospace, monospace`;
      drops.forEach((row, col) => {
        if (row === null) return;
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], col * SIZE, row * SIZE);
        drops[col] = row * SIZE > canvas.height && Math.random() > 0.975 ? 0 : row + 1;
      });
    };

    resize();
    if (reduce || IS_FAST) {
      for (let i = 0; i < 40; i++) step();
      return;
    }

    let frame = 0;
    let raf = 0;
    const loop = () => {
      if (frame++ % every === 0) step();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density, every, reduce]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} />;
}
