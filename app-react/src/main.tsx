import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// Bundled, not loaded from Google Fonts: the app must look the same offline,
// and vite-plugin-pwa precaches these with the rest of the build.
import '@fontsource/exo/latin-400.css'
import '@fontsource/exo/latin-500.css'
import '@fontsource/exo/latin-600.css'
import '@fontsource/exo/latin-700.css'
import '@fontsource/alegreya-sans/latin-700.css'
import '@fontsource/alegreya-sans/latin-800.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
