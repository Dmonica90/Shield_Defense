import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode storyline` inlines the JS and CSS into index.html, so the build also
// opens from file:// inside a Storyline web object.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'storyline' ? [viteSingleFile()] : [])],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
