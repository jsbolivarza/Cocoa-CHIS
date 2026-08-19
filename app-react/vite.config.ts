import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repo at jsbolivarza.github.io/Cocoa-CHIS/, not
  // the domain root, so every built asset path must be prefixed to match.
  base: '/Cocoa-CHIS/',
  plugins: [react()],
})
