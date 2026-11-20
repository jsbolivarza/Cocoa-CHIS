# Cocoa Household Data Capture — project notes

Fairtrade Living Income data collection PWA for cocoa farmer households.

**This branch (`react-app`) is the React app and nothing else.** Two folders:

- **`app-react/`** — the React + Vite + TypeScript source. This is what you
  edit.
- **`docs/`** — a *built* copy of `app-react/`, nothing more. GitHub Pages
  serves this folder at `jsbolivarza.github.io/Cocoa-CHIS/`. Regenerate it
  (see "Publishing" below), never hand-edit it. Every file in here is
  generated and fingerprinted; its diffs are noise.

### Branches (cleaned 17.11.26)

Long-lived: `react-app` (this app, the live Pages source),
`jsbolivarza-patch-2` (vanilla app: formula reference and fallback),
`main` (GitHub default; still the old vanilla app). Work happens on a short
branch off `react-app`; **once it is merged and published, delete it**
locally and on GitHub. Releases are tagged instead (`v0.3.0-prototype` =
the 0.3.0 shown as prototype), so a finished branch is never needed to get
back to a version.

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

**Tablet/laptop layout (16.11.26, published 17.11.26 in 0.2.0):** the C hub
+ money flow direction from `design/shell-options`
(HT*). Wide screens (`WIDE_QUERY` in `lib/layout.ts`, min 901 x 521 px)
get `HouseholdRail.tsx` (step status, per-step summaries from
`lib/stepSummary.ts`, season chips, money flow; collapses to an icon strip
on Profile/Revenues/Costs/Labour below 1366 px), `HubScreen.tsx` as the
first screen of a record (`currentTab === "hub"`), and on Results an
incomplete-steps warning plus `MoneyWaterfall.tsx` (columns left to right).
Styles in `src/wide.css`, scoped to `body.layout-wide`. Phones keep the
old shell. Record format, `calc.ts` and exports unchanged. Exo and
Alegreya Sans bundled via @fontsource (precached). Decisions by JB:
layout first; Results always opens (warning, not locked); no coloured left
stripe on cards and notes; waterfall horizontal. Next: test on a real
iPad (installed, offline); "Doesn't know" markers and implausible-amount
warning (data model change); phone pass of the layout.

**Data features (17.11.26, published in 0.2.0, with the
Supabase config baked in):**
- **"Doesn't know" marker** on every number field (`NumberField` in
  `fields.tsx`, a "?" toggle). Marked paths live in `meta.unknownFields`;
  the value stays `""`, so `calc.ts` is unchanged and counts it as 0.
  `removeRow` remaps markers (`unknownFieldsAfterRowRemoval`); "Start new
  season" carries markers on the copied profile tables. Results shows a
  per-step count. `formatVersion` 3; `normalizeRecord()` backfills on load
  and import.
- **CSV export** now has `farmer_id`, `season`, `unknown_field_count`,
  `unknown_fields`.
- **Producer roster** (`lib/roster.ts`, Settings → Producer roster): CSV
  with header `producer_code` (required), `producer_name`, `village`,
  `coop_name`; comma or semicolon. Format defined by us, not by a coop yet.
  Stored in Dexie table `roster` (schema **v3**), replaced wholesale per
  import, not cleared by "Delete all data". With a roster loaded, Profile's
  member code offers the codes (datalist), picking one fills name, village
  and coop; an unlisted code is allowed with a warning.
- **Upload to server (prototype, Supabase free tier; JB 17.11.26: free/
  low-cost, readable from Python, R, Power BI).** `lib/sync.ts` (plain
  fetch, no supabase-js), `SyncPanel.tsx` on Settings: coach signs in
  (Supabase Auth email/password), "Upload now" upserts changed records.
  One way, manual; only records with `consent.releaseFI`. Bookkeeping in
  Dexie **v4** tables `syncLog` (uploaded `updatedAt` per record) and `kv`
  (session), not in the record. Config from `app-react/.env.local`
  (`.env.example`); without it the panel says "not connected". Server:
  `supabase/schema.sql` (table `households` with full record jsonb +
  `summary` = CSV row; view `households_flat` = typed CSV columns,
  generated from `csvRowForRecord()`, so keep them in step; RLS: coaches
  write own rows, `analyst` role reads). `analysis/`: README (setup,
  Power BI), Python and R examples. ⚠️ Building `docs/` with `.env.local`
  present bakes the server into the published app.
- Next: try on device; check the roster format with a real coop list;
  Supabase project `rvpwquzuknwcntzosqlr` created and an upload from
  the dev server confirmed by JB (17.11.26). Power BI reads
  `households_flat` via the analyst login (session pooler; Windows needed
  the Supabase CA cert, see `analysis/README.md`). End-to-end test done
  17.11.26: 50 generated test households (34 farmers, 4 coops, 2 seasons)
  imported, uploaded, shown in Power BI after Refresh. **Supabase holds 59
  test rows (50 generated + JB's 9); delete them before real data**
  (`delete from public.households;`). Generated test data must use the
  app's option keys (`hectare`, not `ha`). Import JSON re-ids records, so
  importing and uploading the same households twice duplicates them on
  the server (happened once, 17.11.26); use Download to move data between
  devices. **Raw data for analysts** (17.11.26): `supabase/raw_views.sql`
  (18 typed `raw_*` views + `to_num()`, run in Supabase) and
  `analysis/codebook/*.csv` are GENERATED from the app's data model by
  `node analysis/tools/run.mjs`; re-run both after any record-format
  change. `analysis/export_raw.R` tested end to end (cocoa sales from raw
  rows = app totals for all 59); `export_raw.py` untested (no Python on
  JB's laptop). JB is also the analyst for the prototype and confirmed
  `load_all()` working in RStudio (17.11.26). Analyst password in
  `.Renviron` in R's home, never in the repo. On Windows R's home is
  **Documents** (`C:\Users\<user>\Documents\.Renviron`), not the user
  folder; Git Bash sets a different HOME, so a test run from the terminal
  can pass while RStudio finds nothing. Check with `path.expand("~")`.
  Next: data-protection sign-off before any real household goes up.

**List screens, tablet/laptop + phone (17.11.26, published in 0.3.0):**
HT0 applied to everything outside a
record. `ListShell.tsx`: 96 px navy menu (Records, Compare, Export,
Settings) replacing AppBar, tab strip and BottomNav on wide screens; shared
`ListHeader` (large title, online/offline + "saved on this device").
Records: search + New household in the header, one table row per farmer
(name, code, village · coop, season tags with progress, "⋮" menu, now the
shared `RecordMenu`). Compare/Export/Settings/season history render in the
same shell; their own first h3 is hidden there. Phones (H0): `AppBar`
redone (navy header: brand, large title, status, search), farmer cards
with season tags, dashed "New household". **Brand row** (`Brand.tsx`,
"Cocoa Capture" + subtitle + app icon) on every screen incl. the household
rail. Fairtrade logo: drop the official file in
`src/assets/brand/fairtrade-logo.svg|png` and it appears (glob import);
not in the repo yet, deliberately not hand-drawn (protected mark). Phone
household screens (H1–H9) still the old shell. Also: no coloured left
stripes anywhere (removed in `style.css`, not overridden); all fonts are
the bundled Exo / Alegreya Sans (Inter and "Exo 2" were never bundled);
Results on phones: waterfall as labelled horizontal bars, results table as
compact two-value rows (`wide.css`, phone media query; selectors need
`table.data-table.results-table` to beat the 640 px table min-width).
Next: Fairtrade logo file; phone pass of the household screens (H1–H9).

**Team decks and KPI dashboard (18.11.26, outside the app):**
- Two Supabase/analysis decks (Fairtrade Slides design system): overview
  for the GPPP senior advisor, cocoa GPM and GI
  (claude.ai/artifact/JCWFq9TmkTeetHFZ1GgtZf) and backend detail for DSU
  (claude.ai/artifact/UfG3hL2zTo9Fa1vduqhkTo). Private until shared. Note:
  `Downloads\CHIS_Data_Capture_Architecture.pptx` (14.08.26) still describes
  the older Nextcloud / no-backend plan.
- Power BI KPI dashboard: `Desktop\Cocoa KPI dasboard.pbip` (PBIP, folders
  `Cocoa prototype dashboard.*`). KPIs = the 22 in
  `Cocoa_COSP_PWA_Slide_Deck.pptx` (27.09.26); 118 measures on
  `households_flat` plus a `Benchmarks` table (living income, living wage,
  LIRP, FMP per currency, blank until JB enters them in Power Query). 7 pages:
  Overview, 5 KPI groups, hidden drill-through "Household detail"
  (`household_id`). Native visuals only: JB rejected a static background
  image. Pages are generated by `analysis/powerbi/build_kpi_pages.mjs`
  (writes to the Desktop project; default = the 5 group pages). Lessons:
  close Power BI before generating (it overwrites on save and reorders
  TMDL); a hand-written drill-through filter shows in the well but not in
  the right-click menu, so re-add the field in Power BI and never regenerate
  that page.json; KPI cards = one classic card with container title (label)
  and live subtitle (context line), not stacked visuals.
- Next: JB's screenshots of the 5 group pages; enter benchmark values.

**iPad test (19.11.26):** install, Supabase sign-in and Download fine.
Results waterfall values overlapped on iPad (absolutely positioned, so
they never widened their column); fixed in 0.4.1. iPad Safari then showed
no bars in the tappable columns: an absolutely positioned bar inside a
`<button>` is not drawn there (desktop Chrome's iPad mode does draw it, so
it can't catch this). Columns are now `div role="button"` (0.4.2); bars
confirmed on the iPad. Next: rest of the iPad checklist (layout in both
orientations, offline reopen, Upload), then the phone pass of H1–H9.

**Duplicates (19.11.26, 0.4.3):** pressing Upload twice never duplicated
(upsert on id). Duplicates came from Import JSON giving records new ids and
from the same farmer captured twice. Now Import keeps ids and merges like
Download (newest wins, counts shown). Upload retries a refused batch one
record at a time and reports households owned by another coach (RLS)
instead of failing them all. Server: `households_current` = latest upload
per coop + member code + season (blank code never merged); `households_flat`,
the `raw_*` views and the R/Python examples read it; `households_duplicates`
lists what was set aside; nothing deleted. JB to re-run `schema.sql`, then
`raw_views.sql`. Open: blocking a second capture of the same farmer and
season at upload (option B) needs a decision on which record wins.

**Data review roles (proposal, 19.11.26, not built; open questions go to
DSU):** coach (capture, own uploads); FTA reviewer (reads all coaches'
households, downloads them for assessment, may also correct them in the
app after verifying by phone with the coach, presses a "Reviewed" mark like
the step completion marks); FI analyst (cleaning layer on top of raw, never
overwrites it); admin (JB, full access). Layers: raw base (version history
keeps the first upload), review status (separate from the record, "changed
since review" if edited after), updated base feeding Power BI. Because
results come from `calc.ts`, corrections to inputs must be made in the app
or need a server-side recalculation. Open for DSU: may the reviewer edit
every field; does a later edit reset "Reviewed"; FI corrections as a log
(recommended) or cleaned tables from R; Power BI reviewed-only or all with
a filter. Today RLS lets only the uploading coach update a row, so reviewer
edits need a new policy and must not change `coach_user`.

**Since last season card (20.11.26, not published):** `SeasonCompareCard.tsx`
on the hub (wide layout only): cocoa produced, yield, farmgate price, cocoa
area and net farm income beside the same `farmerId`'s previous season label,
grey ▲/▼ %, "so far" on income until all steps are complete, no % where
units or currency differ; "See all seasons" opens `FarmerHistoryScreen`.
Text only so the money flow stays the one chart (JB). Layout only, no
record-format change. After a design review (JB found grey ▲/▼ unfriendly)
it became a full-width table (previous | current | change, plain "+18 %",
amber "check with farmer" chip from ±25 % / ±50 % income, placeholder
limits). Same pass: one step count everywhere (`recordProgress` = 6 capture
steps; Results can't be marked; phone header shows done count, not
position); field hints no longer uppercase; Resume + Needs attention merged
into one card; short step names on the collapsed rail (84 px); Labour month
column sticky; "Delete all data" moved to an outlined section at the end of
Settings; Results opens on the KPI tiles; required-fields note hidden on
Results; translated import error. Review archive in `.impeccable/critique/`.
Colour preview (not decided): `src/theme-quiet.css`, only active with
`?theme=quiet` in the URL (white headers and rails, grey hairlines, navy the
only filled colour, status dots instead of tinted boxes). Second preview
`?theme=grouped` (`src/theme-grouped.css`, layered on quiet): patterns
adapted from JB's GitHub-app phone screenshots (grey page, white rounded
groups, step rows with coloured tiles + inset dividers + chevrons, pill
buttons/chips, floating pill tab bar on phones). `?font=exo`
(`src/font-exo.css`, combinable with either theme) sets headings in Exo 700
instead of Alegreya Sans, one font family. Grouped also moves the list
menu (Records/Compare/Export/Settings) on tablet/laptop into the phone's
floating pill bar, centred at the bottom. For every theme: the Records
header and table now share one centred column (max 1320 px) and a "Last
updated" column appears from 1280 px. `WIDE_QUERY` lowered from 901 to
744 px wide (20.11.26) so an upright iPad keeps the tablet shell (hub,
rail, floating bar); upright (< 1024 px) every step but the hub uses the
collapsed rail (`NARROW_WIDE_QUERY`). Quiet/grouped callouts: stat strips
and KPI tiles on a soft grey fill, 13 px sentence-case labels, 18 px values,
headline tile (profit / total spending) navy-tinted; all callouts kept (some,
e.g. subsidized labour, appear nowhere else). All themes: `.stat-row` is
an even grid (no stranded box when it wraps); `KpiCard`/`StatBox` take an
optional one-line `note`. Profile → Farm distribution: callouts stay above
the plots (JB: coaches watch them change while typing, no long text); the
two % boxes became notes on their area boxes; the cocoa-area and
farm-area tiles show "IMS x · ±n %" with the amber "check with farmer" chip
above 10 % (both measured) / 25 % (any estimate). Display only, nothing
saved; first piece of the area rule in the validation proposal. Table
dropdowns (`SelectField wrap`, all themes) show the chosen option as text
wrapping onto two lines with the real select invisible on top, so the
device's own list still opens (JB rejected buttons and a split Labour
table, 20.11.26); quiet/
grouped field labels, table headers and h4s in sentence case. Tables that
scroll sideways fade the edge with hidden columns (`lib/scrollCue.ts`, all
themes) and get a visible scrollbar; quiet/grouped put the "?" inside the
number field (preview, revert = delete that block in theme-quiet.css). JB to choose; if kept,
fold it into the tokens and drop the URL switch. Also proposed (not built): validation rules in three
layers (block / warn-and-confirm / server flags) and the gaps that break
farmer tracking (blank season merges seasons in `households_current`, free-
text coop name in the server key, no upload history). Next: check the card
in the browser with a two-season farmer, then publish as 0.5.0.

Known gaps / deliberately deferred, in rough priority order:
- **Sync is manual, upload + "Download my households" (0.4.0,
  17.11.26).** Download (`sync.ts` `downloadRecords()`,
  paged 200) fetches the signed-in coach's own uploads (RLS
  `coach_select_own`) and merges via `storage.mergeServerRecords()`: ids
  KEPT (unlike Import JSON, which re-ids), newest `meta.updatedAt` wins,
  written straight to Dexie so `updatedAt` isn't re-stamped, and logged in
  `syncLog` as already uploaded. Known limits: an edit on the losing
  device is dropped silently; deleting on a device doesn't delete on the
  server (a later download brings it back); no per-coop / coordinator read
  access. `producer_code` (roster) is the cross-device key; `farmer_id` is
  not.
- **Roster is per device.** Each coach imports the CSV; nothing checks that
  two devices hold the same version.
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
  **v4** (v2 indexed `meta.farmerId`; v3 adds the `roster` table and
  `meta.unknownFields`; v4 adds `syncLog` and `kv` for upload; each
  `.upgrade()` backfills older records).
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
npm version 0.X.Y --no-git-tag-version   # ALWAYS bump first (see below)
rm -rf dist
npm run build
cd ..
rm -rf docs/*
cp -r app-react/dist/* docs/
git add -A docs app-react
git commit -m "..."
```

**Bump the version on every publish.** Settings shows "Version X · built
dd.mm.yy" (`__APP_VERSION__` from `package.json`, `__APP_BUILT__` = build
date, both in `vite.config.ts`'s `define`), and uploads record it as
`app_version`. It stayed at 0.1.0 through several releases before 17.11.26,
so coaches couldn't tell builds apart. Patch (0.3.1) for fixes, minor
(0.4.0) for new features. History: 0.2.0 = hub layout, "Doesn't know",
roster, Supabase upload; 0.3.0 = tablet/phone list screens, brand row,
phone Results (both 17.11.26); 0.4.0 = "Download my households" (17.11.26); 0.4.1 = waterfall amounts
under the labels, not floating over the bars; 0.4.2 = waterfall bars drawn
on iPad; 0.4.3 = Import JSON keeps ids, upload skips other coaches'
households; 0.4.4 = calculated CSV/summary columns rounded (2 decimals,
`pct_*` shares 4; typed values as entered) (all 19.11.26). Rows uploaded
before 0.4.4 keep their long decimals until re-uploaded.

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
