import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

// GitHub Pages serves this repo at jsbolivarza.github.io/Cocoa-CHIS/, not the
// domain root, so every built asset path must be prefixed to match — and while
// this build lives at a preview subfolder alongside the still-live vanilla
// app (rather than replacing it at the root), that prefix changes per build.
// One env var drives every place the path is needed (Vite's own base, the
// PWA manifest's start_url/scope, and workbox's navigateFallback) instead of
// hand-editing each — a mismatch between them is a real service worker
// registration error, not just a cosmetic bug.
const BASE = process.env.VITE_APP_BASE || '/Cocoa-CHIS/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  // Shown on the Settings screen (settings_version) and used by the
  // "Check for updates" button, same purpose as APP_VERSION in
  // docs/js/app.js: a coach can confirm they're on the version they were
  // told to be on, without a hard reload or a developer.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    // Ported from docs/manifest.json + docs/service-worker.js. Vite
    // fingerprints every build's asset filenames, so a hand-written cache
    // list (like the vanilla service worker's ASSETS array) would go stale
    // on every deploy — this plugin generates the precache manifest from
    // the actual build output instead. registerType: "prompt" matches the
    // vanilla app's philosophy exactly: a new version waits, and is only
    // applied when the coach accepts, rather than swapping code out from
    // under a half-finished interview.
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Cocoa Household Data Capture',
        short_name: 'Cocoa Capture',
        description: 'Fairtrade Living Income household data collection tool for cocoa.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFFFFF',
        theme_color: '#001B6E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell; anything else same-origin falls
        // back to the shell when offline (client-side routing has no other
        // real pages to navigate to).
        navigateFallback: `${BASE}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
