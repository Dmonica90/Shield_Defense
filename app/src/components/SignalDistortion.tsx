import { useEffect, useRef } from 'react';

export type DistortionMode = 'intro' | 'bursts';

/** Static is drawn at a fraction of the screen size and scaled up, blocky and cheap. */
const NOISE_SCALE = 3;
const INTRO_MS = 900;

const between = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * A bad signal: static, torn horizontal bands tinted red/cyan, and a rolling
 * bar. `intro` is a single burst as the scene opens; `bursts` keeps a faint
 * static going and breaks up every 3–5 s. `onBurst` tells the scene when a
 * burst starts and ends so it can shake the content too. Nothing flashes white
 * and bursts stay at least 3 s apart, well under photosensitivity limits.
 * Callers leave it out entirely under reduced motion and the test mode.
 */
export function SignalDistortion({
  mode,
  onBurst,
}: {
  mode: DistortionMode;
  onBurst?: (active: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onBurstRef = useRef(onBurst);
  onBurstRef.current = onBurst;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const noise = document.createElement('canvas');
    const nctx = noise.getContext('2d');
    if (!canvas || !ctx || !nctx) return;

    let width = 0;
    let height = 0;
    let image: ImageData | null = null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      noise.width = Math.max(1, Math.ceil(width / NOISE_SCALE));
      noise.height = Math.max(1, Math.ceil(height / NOISE_SCALE));
      image = nctx.createImageData(noise.width, noise.height);
    };

    const drawStatic = (alpha: number) => {
      if (!image) return;
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
      nctx.putImageData(image, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(noise, 0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    const drawBurst = (elapsed: number) => {
      drawStatic(0.16);
      // Torn bands: a strip of static shoved sideways, tinted red or cyan.
      const bands = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < bands; b++) {
        const y = Math.random() * height;
        const h = between(4, 34);
        const shift = between(-40, 40);
        ctx.drawImage(noise, 0, y / NOISE_SCALE, noise.width, h / NOISE_SCALE, shift, y, width, h);
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255, 0, 60, 0.18)' : 'rgba(0, 240, 255, 0.18)';
        ctx.fillRect(0, y, width, h);
      }
      // The rolling bar of a signal losing vertical hold.
      const barY = ((elapsed / 600) * height) % height;
      const bar = ctx.createLinearGradient(0, barY - 60, 0, barY + 60);
      bar.addColorStop(0, 'rgba(160, 200, 190, 0)');
      bar.addColorStop(0.5, 'rgba(160, 200, 190, 0.12)');
      bar.addColorStop(1, 'rgba(160, 200, 190, 0)');
      ctx.fillStyle = bar;
      ctx.fillRect(0, barY - 60, width, 120);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const start = performance.now();
    // The next burst as [start, end] in ms since mount; the first one is immediate.
    let burstStart = 120;
    let burstEnd = mode === 'intro' ? INTRO_MS : burstStart + between(300, 600);
    let inBurst = false;
    let frame = 0;

    const setBurst = (active: boolean) => {
      if (active === inBurst) return;
      inBurst = active;
      onBurstRef.current?.(active);
    };

    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, width, height);

      if (t >= burstStart && t < burstEnd) {
        setBurst(true);
        drawBurst(t - burstStart);
      } else {
        setBurst(false);
        if (mode === 'intro' && t >= burstEnd) return; // done; leave the canvas blank
        if (t >= burstEnd) {
          burstStart = burstEnd + between(3000, 5000);
          burstEnd = burstStart + between(300, 600);
        }
        drawStatic(0.04);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (inBurst) onBurstRef.current?.(false);
    };
  }, [mode]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
