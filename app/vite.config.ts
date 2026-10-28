import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * The SCORM build (`--mode scorm`) is the same app plus the driver: its
 * `index.html` sits in `scormcontent/` and loads `../core/scorm-driver.js` as
 * a classic script, so `window.SCORM` exists before the app's module runs.
 */
const scormDriver = (): Plugin => ({
  name: 'scorm-driver',
  transformIndexHtml: {
    order: 'pre',
    handler: () => [{ tag: 'script', attrs: { src: '../core/scorm-driver.js' }, injectTo: 'head' }],
  },
});

// `--mode storyline` inlines the JS and CSS into index.html, so the build also
// opens from file:// inside a Storyline web object.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'storyline' ? [viteSingleFile()] : []),
    ...(mode === 'scorm' ? [scormDriver()] : []),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
