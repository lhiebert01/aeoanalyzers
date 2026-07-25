import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // SECURITY: never inline GEMINI_API_KEY into the client bundle. The old
    // `define` here baked the plaintext key into the browser JS, where it was
    // harvested from the deployed site and caused GCP project suspension
    // (2026-07-24). All Gemini calls must go through the server-side api/
    // functions (api/_lib/engines.ts reads process.env server-side). The
    // browser must never hold the key. See docs/security-incidents/.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
