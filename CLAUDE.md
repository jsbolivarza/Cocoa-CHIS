# Cocoa Household Data Capture — project notes

Fairtrade Living Income data collection PWA for cocoa farmer households.
Two things currently coexist in this repo:

- **`docs/`** — the live vanilla JS/HTML PWA. GitHub Pages serves this folder
  directly (no build step) from the `jsbolivarza-patch-2` branch, at
  `jsbolivarza.github.io/Cocoa-CHIS/`. This is the source of truth for
  behavior/formulas until the migration below reaches parity — do not treat
  `docs/` as legacy-to-delete yet.
- **`app-react/`** — an in-progress migration of that app to React + Vite +
  TypeScript, being built incrementally alongside `docs/` rather than
  replacing it in place.

## Migration plan

Rebuilding `docs/js/app.js`'s tabs as components one at a time, easiest
first: **Consent (done) → Expenditures → Profile → Costs → Revenues →
Labour → Results/Compare**. The list-screen shell (records list, search,
export, settings, compare) is built alongside the tabs since it's shared
infrastructure, not part of the tab sequence.

Status as of this writing:
- Shell: `AppBar` (context-sensitive header bar), list-tab nav
  (Records / Compare / Export / Settings), `ConfirmModal` (avoids
  `window.confirm()` — unreliable in iOS WKWebView, same reason the vanilla
  app avoids it) — all built.
- Tabs: Consent — built. Everything else — not started.
- Compare tab is a stub (just the "need 2+ records" guard); the full
  comparison table/chart is deferred until Results exists, since it reads
  calculated fields from every tab.
- Not started: service worker / PWA installability for the React build,
  and the GitHub Actions workflow to build + deploy it.

## Architecture decisions (already made, don't re-litigate without reason)

- **Vite + React + TypeScript**, scaffolded via `npm create vite@latest`.
- **Base path**: `vite.config.ts` sets `base: '/Cocoa-CHIS/'` — required
  because GitHub Pages serves this repo from a subpath, not the domain root.
  Deploy target stays `jsbolivarza-patch-2` (same branch the live site uses).
- **State**: Zustand (`src/store/appStore.ts`), one store mirroring the
  vanilla app's module-level globals (`record`, `records`, `screen`, etc.)
  but with immutable updates (`src/lib/paths.ts`'s `setPathImmutable`)
  instead of the original's in-place mutation + full re-render.
- **Storage**: Dexie / IndexedDB (`src/lib/storage.ts`), replacing the
  vanilla app's single-`localStorage`-blob approach. One row per household
  instead of one JSON string for the whole collection — avoids re-serializing
  every record on every save, and lifts the ~5-10MB localStorage ceiling
  (tighter on iOS Safari) that mattered for a "capture many households
  before exporting" field workflow. Includes a one-time migration that reads
  the old `cocoa_capture_records_v2` (and legacy `v1`) localStorage keys into
  IndexedDB on first load, then clears them.
- **Ported near-verbatim** (logic unchanged, just typed): `i18n.ts`,
  `dataModel.ts`, `calc.ts` from `docs/js/i18n.js` / `data-model.js` /
  `calc.js`. If the vanilla app's formulas change, port the change here too.
- Language switching lives on the **Settings** screen, not the header —
  matches where the deployed vanilla app actually put it (its header
  lang-switch is stashed hidden by `buildAppBar()`), not an oversight.
- Single-record export (JSON/CSV) lives in each record card's "⋮" menu,
  matching the deployed app; bulk export lives on the Export tab.

## Running app-react/

```
cd app-react
npm install
npm run dev      # http://localhost:5173/Cocoa-CHIS/
npm run build    # tsc -b && vite build — must pass clean before committing
```

## Testing devices

Desktop (Windows/Mac), iPhone/iPad (via Mac + Safari Web Inspector for
console access), and Android — field devices may be any of these, so don't
assume iOS-only or desktop-only behavior when building a tab.
