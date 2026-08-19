# app-react

The React + Vite + TypeScript rebuild of the Cocoa Household Data Capture
PWA. For what the app actually *does* for an enumerator in the field, see
the root [`README.md`](../README.md) — that description applies here too,
this file is about the codebase, not the user-facing behavior.

This is being built incrementally alongside the original vanilla JS/HTML
app in [`../docs/`](../docs/), which stays the live, deployed app and the
source of truth for formulas/behavior until this one fully replaces it.
For *why* things are built the way they are — architecture decisions,
known gaps, deployment specifics — see [`../CLAUDE.md`](../CLAUDE.md).
This README is the "where do I look" map; that one is the "why is it like
this" reference.

## Quick start

```
npm install
npm run dev       # http://localhost:5173/Cocoa-CHIS/
npm run build     # tsc -b && vite build — must pass clean before committing
npm run preview   # serves the built dist/ — needed to test PWA/offline
                   # behavior, since the dev server never registers a
                   # service worker
npm run lint      # oxlint
```

`npm run dev` does not exercise offline/install behavior — `vite-plugin-pwa`
only generates a service worker for a real build. Use `build` + `preview`
for that, or the published preview (see `../CLAUDE.md`).

## How a screen gets on screen

`main.tsx` mounts `App.tsx`, which reads a handful of top-level fields off
one Zustand store (`store/appStore.ts`) to decide what to render:

- `screen`: `"list"` (the records overview + Compare/Export/Settings),
  `"editor"` (one household's tabs), or `"history"` (one farmer's seasons
  side by side).
- `currentTab` / `listTab`: which tab is active within whichever screen.
- `record` / `records`: the household currently open, and every household
  on the device.

There's no router — `App.tsx` is one big conditional based on that state,
matching the vanilla app's own single-page, JS-driven screen switching.

## Project structure

```
src/
├── App.tsx              top-level screen switch (see above)
├── main.tsx              React entry point
├── style.css             one stylesheet, shared with docs/ — vanilla and
│                         React render the same class names on purpose
├── vite-env.d.ts         Vite's ambient types + __APP_VERSION__ global
│
├── store/
│   └── appStore.ts       the one Zustand store: records, current screen/
│                         tab, save status, and every action that mutates
│                         a record (updateField, addRow, startNewSeason, …)
│
├── lib/                  framework-free logic — no React imports here
│   ├── dataModel.ts       HouseholdRecord shape, TABLE_SCHEMAS for every
│   │                      repeating table, emptyRecord()
│   ├── calc.ts            every calculated figure (revenues, costs,
│   │                      results, …), ported ~verbatim from docs/js/calc.js
│   ├── i18n.ts            EN/FR/ES strings + every dropdown's option list
│   ├── storage.ts         Dexie (IndexedDB) persistence, JSON/CSV export,
│   │                      JSON import, the old-localStorage migration
│   ├── compare.ts         reduces one record to the row Compare/Farmer
│   │                      History need (compareSummary())
│   ├── duplicates.ts      finds a likely duplicate farmer by producer
│   │                      code/name, for the Profile-tab warning banner
│   ├── seasons.ts         the standardized season picklist (2024/2025, …)
│   ├── paths.ts           getPath/setPathImmutable — dot-path get/set used
│   │                      by every field's onChange
│   ├── tabs.ts             TABS/LIST_TABS order + label/section lookups
│   ├── recordProgress.ts  step-rail complete/started/empty state, list
│   │                      progress bar %
│   ├── format.ts          fmt() number formatting
│   ├── layout.ts          the shared phone-breakpoint media query string
│   └── useMediaQuery.ts   hook wrapping that query (Labour/Revenues use it
│                          to switch between a grid and a phone picker)
│
└── components/
    ├── Screens: RecordsScreen, CompareScreen, ExportScreen,
    │   SettingsScreen, FarmerHistoryScreen
    ├── Tabs: ConsentTab, ProfileTab, RevenuesTab, CostsTab, LabourTab,
    │   ExpendituresTab, ResultsTab
    ├── Shell: AppBar, BottomNav (phone list nav), StepFooter (mark
    │   complete / back / next), StepIcon, ConfirmModal, UpdateBar
    └── Shared building blocks: fields.tsx (TextField/NumberField/
        SelectField/CheckboxField, all bound to a record path via
        updateField), DataTable (generic add/remove-row table driven by
        TABLE_SCHEMAS — every repeating table in the app is one of these),
        MonthlySalesTable (cocoa/coffee sales, with the phone month-picker),
        Kpi (KpiCard/StatBox), CompareChart (the diverging gap-vs-season
        bar chart, used by both Compare and Farmer History)
```

## A record's life cycle

1. `emptyRecord()` (`lib/dataModel.ts`) builds a blank `HouseholdRecord`.
   Every field a tab can edit lives somewhere in this one object.
2. Every input in `components/fields.tsx` calls `updateField(path, value)`
   on change — `path` is a dot-path string like `"profile.producerCode"`
   or `"revenues.cocoaSales.3.volume"`. `updateField` clones just the
   touched branch (`lib/paths.ts`), updates the store, and debounce-saves
   to Dexie 400ms later.
3. Repeating tables (`DataTable`) read their shape from `TABLE_SCHEMAS` in
   `lib/dataModel.ts` rather than being hand-coded per table — adding a
   column there is enough for a new table's add-row/remove-row/labels to
   work everywhere.
4. `lib/calc.ts` never touches the store — every tab calls its calc
   functions fresh on each render with the current record. Nothing
   calculated is ever stored; it's always derived.
5. `meta.farmerId` groups a farmer's seasons (see `../CLAUDE.md` for why
   this is per-device only, not a cross-device identifier); `meta.season`
   is picked from `lib/seasons.ts`'s generated list. `startNewSeason()` in
   the store seeds a new record from an existing one via
   `emptyRecord(linkTo)`.

## Where to look for a specific behavior

| Behavior | File |
|---|---|
| Add/remove a row in a table | `store/appStore.ts` (`addRow`/`removeRow`), `components/DataTable.tsx` |
| A calculated number is wrong | `lib/calc.ts` — cross-check against `docs/js/calc.js` |
| A dropdown's options or a translated string | `lib/i18n.ts` (`OPTIONS`, `STR`) |
| Records list grouping / season tags | `components/RecordsScreen.tsx` |
| Farmer/season linking, duplicate warning | `lib/duplicates.ts`, `store/appStore.ts` (`startNewSeason`, `linkToExistingFarmer`) |
| Import/export | `lib/storage.ts` (`importRecords`, `exportJson`, `exportCsv`, `exportAllCsv/Json`) |
| Phone vs. desktop layout switch | `lib/useMediaQuery.ts` + `lib/layout.ts`, used in `LabourTab`/`MonthlySalesTable` |
| Offline/install behavior | `vite.config.ts` (`VitePWA` plugin config), `components/UpdateBar.tsx` |
| Deploying a build | `../CLAUDE.md` → "Publishing the preview" |
