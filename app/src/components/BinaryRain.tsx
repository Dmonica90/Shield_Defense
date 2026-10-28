import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { IS_FAST } from '../timing';

export type RainIntensity = 'light' | 'heavy';

/** Column spacing (px), fall speed (rows per second) and canvas opacity. */
const SETTINGS: Record<RainIntensity, { font: number; gap: number; speed: number; opacity: number }> = {
  light: { font: 16, gap: 2.2, speed: 9, opacity: 0.25 },
  heavy: { font: 15, gap: 1.1, speed: 18, opacity: 0.45 },
};

/**
 * Falling columns of 0s and 1s behind a scene — the system leaking data. Each
 * column has a bright head and a fading trail. Reduced motion and the test mode
 * get a single still frame instead.
 */
export function BinaryRain({ intensity }: { intensity: RainIntensity }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  // Fade in rather than appear, so the rain arrives after the signal breaks up.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { font, gap, speed } = SETTINGS[intensity];
    const still = reduce || IS_FAST;
    let width = 0;
    let height = 0;
    let drops: number[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${font}px ui-monospace, monospace`;
      const rows = height / font;
      const columns = Math.ceil(width / (font * gap));
      drops = Array.from({ length: columns }, () => Math.random() * rows * (still ? 1 : -1));
      if (still) drawStill(rows);
    };

    const bit = () => (Math.random() < 0.5 ? '0' : '1');

    // A frozen frame: each column shows a trail ending at its head.
    const drawStill = (rows: number) => {
      ctx.clearRect(0, 0, width, height);
      drops.forEach((head, i) => {
        const x = i * font * gap;
        const trail = 6 + Math.floor(Math.random() * rows * 0.5);
        for (let k = 0; k < trail; k++) {
          const y = (head - k) * font;
          if (y < 0) break;
          ctx.fillStyle = k === 0 ? '#d7ffe0' : `rgba(0, 255, 102, ${1 - k / trail})`;
          ctx.fillText(bit(), x, y);
        }
      });
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (still) return () => observer.disconnect();

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Fade what is there, so earlier characters become a trail.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, dt * 4)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      const rows = height / font;
      drops.forEach((row, i) => {
        const next = row + dt * speed;
        // Draw a character each time the head crosses into a new row.
        if (Math.floor(next) !== Math.floor(row) && next > 0) {
          const x = i * font * gap;
          const y = Math.floor(next) * font;
          // The old head turns green; clear its cell so the glyphs don't stack.
          ctx.clearRect(x, y - 2 * font + 3, font, font);
          ctx.fillStyle = 'rgba(0, 255, 102, 0.9)';
          ctx.fillText(bit(), x, y - font);
          ctx.fillStyle = '#d7ffe0';
          ctx.fillText(bit(), x, y);
        }
        drops[i] = next > rows && Math.random() < 0.03 ? -Math.random() * rows * 0.5 : next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [intensity, reduce]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: shown ? SETTINGS[intensity].opacity : 0, transition: 'opacity 0.6s ease-out' }}
    />
  );
}
