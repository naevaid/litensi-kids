import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // [BROWSER HISTORY MODE SPA /notifikasi TANPA #]
      // Wajib di dev server: jika user buka /profil-saya langsung → serve index.html
      // (tanpa ini dev server return 404 Cannot GET /profil-saya).
      historyApiFallback: {
        index: '/index.html',
        // IMPORTANT: JANGAN fallback ke index.html untuk path /api/*
        // (API route ke Laravel backend harus lewat normal, bukan SPA index).
        rewrites: [
          { from: /^\/api\/.*$/, to: (context) => context.parsedUrl.pathname as string },
        ],
      },
    },
  };
});
