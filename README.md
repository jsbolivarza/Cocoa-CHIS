# Cocoa Household Data Capture, PWA

*Español: [README.es.md](README.es.md)*

A Progressive Web App for enumerators to capture cocoa household income and cost data in the field, offline, in English, French, or Spanish. Data feeds into COSP (Cost of Sustainable Production) and LIRP (Living Income Reference Price) calculations.

## What's in this folder

```
cocoa-pwa/
├── index.html            entry point
├── manifest.json         PWA metadata (name, icons, colors)
├── service-worker.js     offline caching
├── css/style.css
├── js/
│   ├── i18n.js           translation dictionary + dropdown option lists
│   ├── data-model.js     empty record shape + repeating-table schemas
│   ├── calc.js           calculation engine (mirrors the source Excel formulas)
│   ├── storage.js        local storage + JSON/CSV export/import
│   └── app.js            rendering and event handling
└── icons/
```

> **Check this before deploying.** The paths inside `index.html` and `service-worker.js` must match wherever the files actually sit. If your repository keeps everything flat in the root instead of in `css/`, `js/` and `icons/` folders, those references have to be changed to match, or the app will load a blank page and the service worker will never install. See "Old version still showing" in Troubleshooting.

## Requirements

- **Hosting:** the PWA must be served over **HTTPS**. Browsers refuse to install a PWA or register a service worker over plain HTTP (localhost is the one exception, for testing). Opening the files directly from disk with `file://` does not work either. The app has to be hosted.
- **Browsers:** any current version of Chrome, Edge, Firefox, or Safari, on desktop, Android, or iOS/iPadOS.

## Deploying it

Any static file host works, since there's no backend. The simplest option, and what the reference COSP calculator uses, is GitHub Pages:

1. Create a repository (or a folder in an existing one) and upload the entire contents of `cocoa-pwa/`, keeping the folder structure intact so the paths in `index.html` and `service-worker.js` resolve.
2. In the repository settings, enable GitHub Pages for that branch/folder.
3. GitHub serves it over HTTPS automatically at `https://<username>.github.io/<repo>/`.

Any other static host (Netlify, Vercel, a company's own web server) works the same way: upload the folder, make sure it's served over HTTPS, done.

## Installing on a device

**Android (Chrome):** open the hosted URL, tap the menu (⋮), then "Add to Home screen" or "Install app". Chrome usually offers this automatically after a visit or two.

**iPad / iPhone (Safari):** open the hosted URL in Safari specifically (not Edge or Chrome for iOS, see note below), tap the Share icon, then "Add to Home Screen". Once installed this way it opens full-screen like a native app and works offline.

**Note on iOS browsers:** Edge, Chrome, and Firefox on iOS are all required by Apple to run on Safari's underlying engine rather than their own, so they behave a little differently than they do on desktop or Android. For the best experience on iPad, use Safari itself, both for opening the hosted PWA and for the "Add to Home Screen" step.

## Using the app

### The records screen

Opening the app shows everything captured on that device. It has two tabs.

**My records** lists every household captured so far. "New household record" starts a fresh one without touching the others. Each entry can be opened, or its JSON/CSV exported, or deleted individually.

**Search** filters that list as you type. It matches on producer name, cooperative, village, FLO ID, producer code and respondent name, ignores accents and capitalisation, and matches all the words you type in any order. The counter above the list shows how many of the total are currently showing. The search resets when the app is closed, so a filter never silently hides records the next time someone opens it.

**Compare households** puts every household on the device side by side in one table: cocoa area, yield, cost per kilo, farmgate price per kilo, margin per kilo, net farm income, household expenditure, income minus expenditure, income per person, and labour days on cocoa. The last row is the average across whatever is currently shown.

Four filters narrow the set: cooperative, programme, area unit and currency. The dropdowns only offer values that actually exist in the records on the device.

Money figures in different currencies or area units are not the same quantity, so averaging them produces a meaningless number. When the visible set mixes them, the app shows a warning and leaves those averages blank rather than printing something wrong. Filter down to one currency and one area unit to see them. Currencies are matched case-insensitively and with surrounding spaces ignored, so "xof" and "XOF " count as the same currency, but what the enumerator typed is never modified in the record.

**Delete all data** wipes every household on the device. It asks for confirmation first. Use it when a round has been exported and the tablet is being handed on. There is no undo, so export a JSON backup first if there is any doubt.

### Capturing a household

**The seven tabs.** Consent, then 1. Profile, 2. Revenues, 3. Costs, 4. Labour, 5. Household expenditures, 6. Results, matching the structure of the source Excel workbook. Results are calculated live as you fill in the other tabs.

**Indicators appear above the tables they summarise.** Each section opens with up to three headline figures, then a single strip of smaller supporting numbers, then the tables that feed them. Everything updates live as you type. Negative figures, such as a household spending more than the farm earned, are shown in pink.

**Other income sources (tab 2).** Below the cocoa sections there is a short list of yes/no questions: does this household sell coffee, sell other cash crops, produce staple food crops, produce other food crops, keep livestock, have other farm income. A section only appears on screen once its box is ticked, and an unticked section counts as zero everywhere, including net farm income.

New records start with all six unticked, so the enumerator asks the household and ticks only what applies. This is deliberate: an empty table on screen is an invitation to fill it in, and invented data is worse than no data.

If a box is unticked after data was entered, the rows are kept rather than deleted, so ticking it again brings the figures straight back. Be aware of the consequence: a section that is switched off still holds its rows in the exported JSON while contributing nothing to the CSV totals, and the CSV has no column explaining why. Anyone reviewing raw JSON alongside a CSV should check the `revenues.has` block before concluding the two disagree.

Records captured before these questions existed, and records arriving through "Import JSON", have their answers filled in automatically from whether the tables actually contain anything. A household with livestock rows comes back with livestock ticked, so no existing data is dropped.

**Adding and removing rows.** Most tables (plots, household members, revenue and cost line items) start with a single blank row. Use "+ Add row" to add more as needed, and the ✕ button to remove one. The monthly cocoa/coffee sales tables and the labour table are fixed at 12 months, since those represent the calendar rather than open-ended entries.

**Languages.** The EN / FR / ES toggle in the header switches the interface, labels, and every dropdown answer. Opening a record automatically switches the display language to whichever language it was saved in; use the toggle afterward to view it in a different one. Typed free-text answers (names, notes, village names) are never auto-translated, since there's no reliable way to translate arbitrary text, so they stay exactly as entered regardless of the display language.

**Autosave.** Changes save to the device automatically a few hundred milliseconds after you finish editing a field. The save indicator in the header shows "Saving…" then "Saved."

## Exporting and consolidating data

- **Export JSON** / **Export CSV** (per record): saves the currently open household as its own file.
- **Export all as CSV**: one file with every household on the device as a single row, same columns throughout, ready to paste into a master spreadsheet for consolidation.
- **Export all as JSON**: a full backup of every household on the device in one file. Importing that same file back in (via "Import JSON") restores the whole list, so it also works as a way to move records between devices.
- **Import JSON** accepts either a single exported record or a full "export all" file.

## Data and privacy

Everything is stored locally on the device (in the browser's local storage) until it is explicitly exported. Nothing is sent anywhere automatically; there is no backend and no network calls other than loading the app itself and, optionally, its fonts. If a device already had data saved from an earlier single-record version of this tool, it migrates automatically the first time the new version loads.

Because storage is local and there is no backup, a lost or wiped tablet means lost records. Export regularly.

## Known limitations

- **The CSV export does not match the workbook's `dataset` sheet.** The Excel sheet has 174 columns; the CSV has 83, of which about 11 have no Excel equivalent. The CSV carries the aggregate totals, while the workbook also carries the line-item detail behind them: monthly sales volumes, premium and differential breakdowns, per-crop and per-input splits, tenure arrangements, and subsidy splits. Most of that detail is captured by the app and sits in the exported JSON, it is simply collapsed before reaching the CSV. Two fields are genuinely absent from the data model: household members aged 18 to 25, and two of the four measured/estimate flags. Do not expect the CSV to paste straight into a master sheet built on the workbook's dataset tab.
- **Spanish is a first machine-translated draft.** English and French were reviewed against the source workbook; Spanish should be checked by a native speaker before relying on it in the field.
- **The "hired labour services" list was rebuilt.** The original workbook's French and English versions of that dropdown didn't line up (each row meant something different in each language), so it was rebuilt from the fuller French list with corrected English and Spanish terms rather than copied as-is.
- **Cost-per-kilo and cocoa yield use slightly different volume bases**, matching an inconsistency already present in the source workbook's own formulas (yield includes in-kind sharecropper payments, cost-per-kilo doesn't). This is intentional, to keep the numbers consistent with the tool people already trust, not a bug.
- **Confirmation dialogs are custom-built**, not the browser's native popup, because that native popup is unreliable in iOS browsers other than Safari. If a delete action seems unresponsive, look for the in-page confirmation box rather than a system popup.
- **The app does not announce updates.** A new version is picked up silently the next time it loads, if the service worker installed correctly. There is no banner telling the user an update is available.

## Updating the app after making changes

If you edit any file and redeploy, bump the version number in `service-worker.js` (`CACHE_NAME = "cocoa-capture-vX"`). Otherwise devices that already installed the app may keep serving the old cached version rather than picking up the update.

Bumping the version is necessary but not sufficient. The service worker caches its file list with a single atomic operation, so if even one path in that list returns a 404, the whole install fails, the new version is discarded, and the old one keeps serving indefinitely. After redeploying, open the app once with DevTools, Application, Service Workers, and confirm the new version activated without an install error.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Blank page, no styling, nothing loads | The `css/`, `js/` or `icons/` paths in `index.html` don't match where the files actually are |
| "Add to Home Screen" doesn't appear | Not served over HTTPS, or opened in a non-Safari browser on iOS |
| App doesn't work offline after install | Service worker didn't finish caching on first visit, reopen it once while online, then try offline |
| Old version still showing after an update | `CACHE_NAME` wasn't bumped, or a path in the service worker's asset list returns a 404 so the install keeps failing, or the device needs to fully close and reopen the app once |
| Money averages are blank in the comparison tab | The visible households mix currencies or area units, filter to one of each |
| A revenue section is missing on tab 2 | Its yes/no box under "Other income sources" is unticked |
| Delete button seems to do nothing | Should be fixed as of this version, confirms are now an in-page dialog rather than the browser's native popup |
