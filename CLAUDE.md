# Cocoa Household Data Capture — project notes

Fairtrade Living Income data collection PWA for cocoa farmer households.
Two things currently coexist in this repo:

- **`docs/`** — the live vanilla JS/HTML PWA. GitHub Pages serves this folder
  directly (no build step) from the `jsbolivarza-patch-2` branch, at
  `jsbolivarza.github.io/Cocoa-CHIS/`. This is the source for
  behavior/formulas until the migration below reaches parity — do not treat
  `docs/` as legacy-to-delete yet.
- **`app-react/`** — the React + Vite + TypeScript migration of that app,
  built incrementally alongside `docs/` rather than replacing it in place.
- **`docs/react-preview/`** — a *built* (not source) copy of `app-react/`,
  published to a subfolder so it can be tested on real devices at
  `jsbolivarza.github.io/Cocoa-CHIS/react-preview/` without touching the
  still-live vanilla app at the root. See "Publishing the preview" below —
  regenerate it, never hand-edit it.

## Migration status

All seven tabs and the full list-screen shell are built: Consent, Profile,
Revenues, Costs, Labour, Expenditures, Results (that's the rail's real
navigation order — differs from build order, see git log), plus
Records / Compare / Export / Settings. The migration plan that used to be
tracked here is done; what's left is device testing and the items below.

Built beyond parity with the vanilla app (new features, not ports):
- **Seasonal linking**: `meta.farmerId` groups every season captured for
  the same farmer (`lib/dataModel.ts`); `meta.season` is a standardized
  picklist (`lib/seasons.ts`), not free text — an early free-text version
  let a typo silently fragment one farmer's seasons into unrelated groups.
  "Start new season" (a record card's "⋮" menu) seeds a new record from an
  existing one; `lib/duplicates.ts` warns on the Profile tab when a fresh
  record's producer code/name matches a different farmer already on the
  device, with a one-click fix. The Records list groups by farmer (one
  card per household, season tags newest-first) rather than one card per
  record. `FarmerHistoryScreen` shows one farmer's seasons side by side,
  reusing Compare's summary/table/chart.
- **Offline/PWA support**: `vite-plugin-pwa` (see "PWA" below) — this was
  the last major gap and is now closed.
- **Import JSON**: wired up in Settings (the storage.ts logic existed
  unused for a while before this).
- **Storage diagnostics**: `StorageDiagnostics.tsx`, a read-only block on
  Settings showing household count, space used/quota, whether the service
  worker is active, whether the app is installed to the home screen, whether
  eviction protection was granted, and the Dexie schema version — plus a
  button to request `navigator.storage.persist()`. Exists because field
  devices are phones that will never be cabled to a laptop with DevTools
  open: this makes "is this device actually saving the data?" something a
  coach can read out over the phone. Every field is null/"unsupported"
  tolerant — iOS Safari implements only part of the Storage API, and
  "couldn't ask" must never render as "no".

Known gaps / deliberately deferred, in rough priority order:
- **`producer_code` is still free text.** It's the one durable, real-world
  identifier that could link a farmer's records *across devices* (unlike
  `farmerId`, which is generated per-device and never coordinates between
  coaches' phones — see "Architecture decisions"). A typo breaks that.
  The proper fix is a coop-roster import so the field becomes a picklist,
  same pattern as `seasons.ts` — deferred until a real roster format
  exists to import from.
- **CSV export doesn't include `farmerId` or `season`** (`lib/storage.ts`,
  `csvRowForRecord()`) — JSON export does (it just serializes the whole
  record). Worth adding if a backend ever needs to reconcile seasons from
  a CSV consolidation rather than raw JSON.
- **Records list is still a flat list of farmer cards** — fine at current
  test scale, untested at "100 farmers × several seasons."
- **GitHub Actions build+deploy is still manual** — see "Publishing the
  preview" below.

## Architecture decisions (already made, don't re-litigate without reason)

- **Vite + React + TypeScript**, scaffolded via `npm create vite@latest`.
- **Base path is an env var, not a hardcoded string.** `vite.config.ts`
  reads `VITE_APP_BASE` (default `/Cocoa-CHIS/`) and derives Vite's own
  `base`, the PWA manifest's `start_url`/`scope`, and workbox's
  `navigateFallback` from it, plus `index.html`'s icon links via Vite's
  `%BASE_URL%` placeholder. This exists because the preview build is
  deployed to a *subfolder* (`/Cocoa-CHIS/react-preview/`) rather than
  root — a mismatch between these four is a real service-worker
  registration error, not just a cosmetic bug, so they can't be
  hand-edited independently. The **real, final cutover** (replacing
  `docs/` at the root) is still the eventual deploy target on
  `jsbolivarza-patch-2` — the preview subfolder is a waypoint, not the plan.
- **State**: Zustand (`src/store/appStore.ts`), one store mirroring the
  vanilla app's module-level globals (`record`, `records`, `screen`, etc.)
  but with immutable updates (`src/lib/paths.ts`'s `setPathImmutable`)
  instead of the original's in-place mutation + full re-render.
- **Storage**: Dexie / IndexedDB (`src/lib/storage.ts`), replacing the
  vanilla app's single-`localStorage`-blob approach. One row per household
  instead of one JSON string for the whole collection. Schema is at
  **v2** (`meta.farmerId` indexed; `.upgrade()` backfills older records).
  `localStorage` is now used for exactly one thing, the language preference
  (`cocoa_capture_lang`) — a single small string with no growth risk.
  There is **no** localStorage→IndexedDB migration: one existed for the
  vanilla app's `cocoa_capture_records_v2` key, but the vanilla app never
  went into field use, so the code could only ever find nothing. Removed
  rather than carried as a permanent caveat on the cutover checklist.
  ⚠️ **IndexedDB is scoped to the *origin*, not the path.** `react-preview/`
  and the eventual root deploy share one `cocoa_capture_db`, so every test
  household captured during device testing is a row the production app will
  open after cutover — no warning, no separation. **"Delete all data" on
  every test device is a mandatory cutover step**, not a nice-to-have.
  Convenient side effect: no data migration is needed at cutover.
- **`farmerId` is per-device, not a cross-device identifier.** It only
  links records already present in one device's own IndexedDB (via "Start
  new season" or the duplicate-warning's "link" action). Two different
  coaches' phones capturing the same real farmer in different seasons will
  generate two unrelated `farmerId`s — there is no server/sync layer to
  reconcile that. `producer_code` is the field meant to serve that role
  once centralized (see "Known gaps").
- **PWA**: `vite-plugin-pwa`, not a hand-written service worker like
  `docs/service-worker.js`. Vite fingerprints build filenames on every
  build, so a hand-maintained cache list would go stale immediately — the
  plugin generates the precache manifest from the actual build output.
  `registerType: 'prompt'` matches the vanilla app's philosophy exactly: a
  new version waits and only applies when the coach accepts (`UpdateBar.tsx`),
  never swapping code out from under a half-finished interview.
  `UpdateBar.tsx` also re-checks for updates on foreground-return and
  hourly — the bare `useRegisterSW()` hook only benefits from the
  browser's own default check timing (mostly just on navigation), so a
  deployed fix could otherwise sit undetected in an already-open tab.
- **Ported near-verbatim** (logic unchanged, just typed): `i18n.ts`,
  `dataModel.ts`, `calc.ts` from `docs/js/i18n.js` / `data-model.js` /
  `calc.js`. If the vanilla app's formulas change, port the change here too.
- Language switching lives on the **Settings** screen, not the header —
  matches where the deployed vanilla app actually put it (its header
  lang-switch is stashed hidden by `buildAppBar()`), not an oversight.
- Single-record export (JSON/CSV) lives in each record card's "⋮" menu,
  matching the deployed app; bulk export lives on the Export tab.
- **CSS class reuse caution**: a header pill class (`.save-status`) is
  deliberately hidden below 720px in `style.css` to free up phone header
  space — fine for the decorative "Saved" text it was written for, wrong
  for anything that's an actual navigation control (bit us once with the
  "Compare seasons" link; it now has its own class, `.bar-chip`). Check a
  class's *other* media-query rules before reusing it for a new purpose.

## Running app-react/

```
cd app-react
npm install
npm run dev      # http://localhost:5173/Cocoa-CHIS/ — no service worker here,
                  # vite-plugin-pwa only activates it in a built output
npm run build    # tsc -b && vite build — must pass clean before committing
npm run preview  # serves dist/ to actually test PWA/offline behavior locally
npm run lint     # oxlint — noUnusedLocals/noUnusedParameters are on in
                  # tsconfig, so tsc -b already catches most dead code too
```

## Publishing the preview (`docs/react-preview/`)

Not automated yet (no GitHub Actions workflow). To regenerate:

```
cd app-react
rm -rf dist
VITE_APP_BASE="/Cocoa-CHIS/react-preview/" npm run build
cd ..
rm -rf docs/react-preview/*
cp -r app-react/dist/* docs/react-preview/
git add docs/react-preview app-react
git commit -m "..."
```

A plain `npm run build` (no `VITE_APP_BASE`) defaults to the root path and
will break every asset/manifest/service-worker link if dropped into
`docs/react-preview/` directly — always pass the env var for this target.

## Testing devices

Desktop (Windows/Mac), iPhone/iPad (via Mac + Safari Web Inspector for
console access), and Android — field devices may be any of these, so don't
assume iOS-only or desktop-only behavior when building a tab. Real PWA
install/offline testing needs HTTPS (or localhost) — the LAN dev-server
trick used earlier in the migration doesn't exercise the service worker at
all; use the published `docs/react-preview/` URL for that.

What's on a phone from `docs/react-preview/` is not a limited build — it is
the same code, service worker and IndexedDB layer a production deploy has.
Only the URL path differs (that's all `VITE_APP_BASE` handles), so testing
storage behavior there is testing what ships.

⚠️ **iOS storage eviction**: Safari drops IndexedDB for origins unused for
~7 days *unless* the app was installed to the home screen. For a coach who
captures a round and doesn't reopen the app for two weeks, that is silent
data loss with no error. Coaches must install to the home screen, not use a
Safari tab — the Settings diagnostics panel warns when the app is running
in a tab. Worth confirming once with a real >7-day gap on a real iPhone,
both installed and in-tab, before field use.
