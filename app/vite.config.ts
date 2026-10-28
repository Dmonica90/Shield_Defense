import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode scorm` loads the SCORM 2004 driver that sits next to `scormcontent/`
// in the package (scripts/package-scorm.sh). It is a classic script ahead of
// the app's module, so `window.SCORM` exists before React mounts.
const scormDriver: Plugin = {
  name: 'scorm-driver',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html.replace(
        '<head>',
        `<head>
    <!-- LOCAL DEV ONLY — keep commented out in the delivered package -->
    <!-- <script src="../core/mock-api.js"></script> -->
    <script src="../core/scorm-driver.js"></script>`,
      ),
  },
};

// `--mode storyline` inlines the JS and CSS into index.html, so the build also
// opens from file:// inside a Storyline web object.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'storyline' ? [viteSingleFile()] : []),
    ...(mode === 'scorm' ? [scormDriver] : []),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
