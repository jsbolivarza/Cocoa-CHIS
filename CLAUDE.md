# Cocoa Household Data Capture — project notes

Fairtrade Living Income data collection PWA for cocoa farmer households.

**This branch (`react-app`) is the React app and nothing else.** Two folders:

- **`app-react/`** — the React + Vite + TypeScript source. This is what you
  edit.
- **`docs/`** — a *built* copy of `app-react/`, nothing more. GitHub Pages
  serves this folder at `jsbolivarza.github.io/Cocoa-CHIS/`. Regenerate it
  (see "Publishing" below), never hand-edit it. Every file in here is
  generated and fingerprinted; its diffs are noise.

### Why the branch split

The original vanilla JS/HTML PWA lives on **`jsbolivarza-patch-2`**, where its
source *is* `docs/` (no build step). While the React migration was in
progress, the built React app was published to a `docs/react-preview/`
subfolder on that same branch so it could be tested on real devices without
disturbing the vanilla app at the root. That meant one branch holding two
apps plus a generated copy of one of them — hard to follow.

Now each branch holds one app, each with its own `docs/`, both targeting the
same root URL. **Which app is live is a repo setting, not a code change**:
GitHub Pages serves one branch at a time, so switching Pages' source branch
between `jsbolivarza-patch-2` and `react-app` is the whole cutover mechanism.

Consequences worth knowing:
- The vanilla app is the reference for formulas and behavior, but it is
  **not on this branch** — read it at `jsbolivarza-patch-2:docs/js/`.
  References to `docs/js/*.js` below mean that branch's `docs/`, not this one.
- Both branches publish to the same origin *and* the same path, so the
  installed PWA, its service worker and its IndexedDB are shared between
  them. Flipping the Pages branch swaps the app under an existing
  installation; it does not give it a clean slate. See the storage note under
  "Architecture decisions".
- `VITE_APP_BASE` no longer needs to be set for a deploy — the default
  `/Cocoa-CHIS/` is now correct, since this build serves from the root.

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
- **GitHub Actions build+deploy is still manual** — see "Publishing" below.
  Now that `docs/` on this branch is *only* generated output, a workflow that
  builds `app-react/` and deploys to Pages would let it stop being committed
  at all. That's the natural next cleanup.

## Architecture decisions (already made, don't re-litigate without reason)

- **Vite + React + TypeScript**, scaffolded via `npm create vite@latest`.
- **Base path is an env var, not a hardcoded string.** `vite.config.ts`
  reads `VITE_APP_BASE` (default `/Cocoa-CHIS/`) and derives Vite's own
  `base`, the PWA manifest's `start_url`/`scope`, and workbox's
  `navigateFallback` from it, plus `index.html`'s icon links via Vite's
  `%BASE_URL%` placeholder. A mismatch between those four is a real
  service-worker registration failure, not a cosmetic bug, which is why one
  variable derives all of them instead of four hand-edited strings.
  Since the branch split the default is simply correct for deploys, so
  **don't pass `VITE_APP_BASE` unless you are deliberately serving from a
  subfolder.** Keep the indirection anyway: it's what makes serving from
  somewhere other than the root a one-variable change rather than a hunt.
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
  ⚠️ **IndexedDB is scoped to the origin, not to the branch.** There is one
  `cocoa_capture_db` per device for `jsbolivarza.github.io`, shared by every
  build ever served from it — this branch, `jsbolivarza-patch-2`, and any
  future one. So every test household captured while device-testing is a row
  the production app opens later, with no warning and no separation, and
  flipping the Pages branch does not give a device a clean slate.
  **"Delete all data" on every test device is a mandatory step before that
  device goes into real field use**, not a nice-to-have. Convenient side
  effect: no data migration is needed at cutover either.
- **`farmerId` is per-device, not a cross-device identifier.** It only
  links records already present in one device's own IndexedDB (via "Start
  new season" or the duplicate-warning's "link" action). Two different
  coaches' phones capturing the same real farmer in different seasons will
  generate two unrelated `farmerId`s — there is no server/sync layer to
  reconcile that. `producer_code` is the field meant to serve that role
  once centralized (see "Known gaps").
- **PWA**: `vite-plugin-pwa`, not a hand-written service worker like the
  vanilla app's `docs/service-worker.js` (on `jsbolivarza-patch-2`).
  Vite fingerprints build filenames on every
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
  `dataModel.ts`, `calc.ts` from the vanilla app's `docs/js/i18n.js` /
  `data-model.js` / `calc.js` — on `jsbolivarza-patch-2`, not this branch.
  If the vanilla app's formulas change, port the change here too.
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

## Publishing (`docs/`)

Not automated yet (no GitHub Actions workflow). To regenerate:

```
cd app-react
rm -rf dist
npm run build
cd ..
rm -rf docs/*
cp -r app-react/dist/* docs/
git add -A docs app-react
git commit -m "..."
```

`git add -A` matters: Vite fingerprints filenames, so every build *deletes*
the previous `assets/index-*.js` and adds a new one. A plain `git add docs`
can leave the old file tracked and the new one untracked, publishing a
`docs/index.html` that points at a bundle that isn't there.

**No `VITE_APP_BASE` for this target** — the default `/Cocoa-CHIS/` is what
you want now that `docs/` serves from the root. Pass it only for a genuine
subfolder deploy, and if you do:

⚠️ **on Windows, don't use a bash-style env prefix in Git Bash.** MSYS path
conversion rewrites any value starting with `/` into a Windows path, so
`VITE_APP_BASE="/Cocoa-CHIS/x/"` silently becomes
`/Users/<user>/AppData/Local/Programs/Git/Cocoa-CHIS/x/` and every path in
the build is garbage. The build still exits 0; the only hint is a
`"base" option should start with a slash` warning from Vite. Use PowerShell
(`$env:VITE_APP_BASE = "..."; npm run build`) or `MSYS_NO_PATHCONV=1`.

**Verify before copying, whatever you did.** `dist/index.html` asset hrefs,
`dist/manifest.webmanifest`'s `start_url` *and* `scope`, and the
`createHandlerBoundToURL(...)` call in `dist/sw.js` must all carry the same
base. This has broken for real; a 10-second check beats a dead deploy.

### Switching which app is live

GitHub Pages serves one branch at a time. In repo Settings → Pages, the
source is a branch + `/docs`:

- `jsbolivarza-patch-2` + `/docs` → the vanilla app
- `react-app` + `/docs` → this React app

That switch *is* the cutover. Both serve the same URL, so an installed PWA
follows the switch — and because `registerType: 'prompt'` waits for consent,
a device already running the old app keeps it until the coach accepts the
update. Don't expect the change to be instant on a device.

## Testing devices

Desktop (Windows/Mac), iPhone/iPad (via Mac + Safari Web Inspector for
console access), and Android — field devices may be any of these, so don't
assume iOS-only or desktop-only behavior when building a tab. Real PWA
install/offline testing needs HTTPS (or localhost) — the LAN dev-server
trick used earlier in the migration doesn't exercise the service worker at
all; use the published `jsbolivarza.github.io/Cocoa-CHIS/` URL for that,
with Pages pointed at this branch.

What's on a phone from `docs/` is not a limited or preview build — it is
exactly the code, service worker and IndexedDB layer that production has,
because it *is* production. Testing storage behavior there is testing what
ships.

`npm run dev` shows no service worker at all, so the diagnostics panel will
report "Offline mode ready: Not yet" and warn that the app is running in a
tab. Both are correct in dev and neither indicates a bug — use
`npm run build && npm run preview` when you need realistic values locally.

⚠️ **iOS storage eviction**: Safari drops IndexedDB for origins unused for
~7 days *unless* the app was installed to the home screen. For a coach who
captures a round and doesn't reopen the app for two weeks, that is silent
data loss with no error. Coaches must install to the home screen, not use a
Safari tab — the Settings diagnostics panel warns when the app is running
in a tab. Worth confirming once with a real >7-day gap on a real iPhone,
both installed and in-tab, before field use.
