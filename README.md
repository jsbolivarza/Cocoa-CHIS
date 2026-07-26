# Cocoa Household Data Capture — PWA

A Progressive Web App for enumerators to capture cocoa household income and cost data in the field, offline, in English, French, or Spanish. Data feeds into COSP (Cost of Sustainable Production) and LIRP (Living Income Reference Price) calculations.

## What's in this folder

```
cocoa-pwa/
├── index.html          entry point
├── manifest.json        PWA metadata (name, icons, colors)
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

A second deliverable, `cocoa_household_data_capture_standalone.html`, contains everything above bundled into one file. It needs no server or install step, just open it in a browser, but it doesn't support installing as an app icon or background offline caching the way the PWA does.

## Requirements

- **Hosting:** the PWA must be served over **HTTPS**. Browsers refuse to install a PWA or register a service worker over plain HTTP (localhost is the one exception, for testing). `file://` also does not work for the PWA — use the standalone file instead if you need something that opens directly from disk.
- **Browsers:** any current version of Chrome, Edge, Firefox, or Safari, on desktop, Android, or iOS/iPadOS.

## Deploying it

Any static file host works, since there's no backend. The simplest option, and what the reference COSP calculator uses, is GitHub Pages:

1. Create a repository (or a folder in an existing one) and upload the entire contents of `cocoa-pwa/` — keep the folder structure intact, the paths in `index.html` and `service-worker.js` depend on it.
2. In the repository settings, enable GitHub Pages for that branch/folder.
3. GitHub serves it over HTTPS automatically at `https://<username>.github.io/<repo>/`.

Any other static host (Netlify, Vercel, a company's own web server, etc.) works the same way: upload the folder, make sure it's served over HTTPS, done.

## Installing on a device

**Android (Chrome):** open the hosted URL, tap the menu (⋮), then "Add to Home screen" or "Install app". Chrome usually offers this automatically after a visit or two.

**iPad / iPhone (Safari):** open the hosted URL in Safari specifically (not Edge or Chrome for iOS, see note below), tap the Share icon, then "Add to Home Screen". Once installed this way it opens full-screen like a native app and works offline.

**Note on iOS browsers:** Edge, Chrome, and Firefox on iOS are all required by Apple to run on Safari's underlying engine rather than their own, so they behave a little differently than they do on desktop or Android. For the best experience on iPad, use Safari itself, both for opening the hosted PWA and for the "Add to Home Screen" step.

## Using the app

**Household records.** Opening the app shows a list of every household captured on that device so far. "New household record" starts a fresh one without touching the others. Each entry in the list can be opened, or its JSON/CSV exported, or deleted individually.

**The six tabs.** Consent, then 1. Profile, 2. Revenues, 3. Costs, 4. Labour, 5. Household expenditures, 6. Results, matching the structure of the source Excel workbook. Results are calculated live as you fill in the other tabs.

**Adding and removing rows.** Most tables (plots, household members, revenue and cost line items) start with a single blank row. Use "+ Add row" to add more as needed, and the ✕ button to remove one. The monthly cocoa/coffee sales tables and the labour table are fixed at 12 months, since those represent the calendar rather than open-ended entries.

**Languages.** The EN / FR / ES toggle in the header switches the interface, labels, and every dropdown answer. Opening a record automatically switches the display language to whichever language it was saved in; use the toggle afterward to view it in a different one. Typed free-text answers (names, notes, village names, and so on) are never auto-translated, since there's no reliable way to translate arbitrary text — they stay exactly as entered regardless of the display language.

**Autosave.** Changes save to the device automatically a few hundred milliseconds after you finish editing a field. The save indicator in the header shows "Saving…" then "Saved."

## Exporting and consolidating data

- **Export JSON** / **Export CSV** (per record): saves the currently open household as its own file.
- **Export all as CSV**: one file with every household on the device as a single row, same columns throughout, ready to paste into a master spreadsheet for consolidation.
- **Export all as JSON**: a full backup of every household on the device in one file. Importing that same file back in (via "Import JSON") restores the whole list, so it also works as a way to move records between devices.
- **Import JSON** accepts either a single exported record or a full "export all" file.

## Data and privacy

Everything is stored locally on the device (in the browser's local storage) until it is explicitly exported. Nothing is sent anywhere automatically; there is no backend and no network calls other than loading the app itself and, optionally, its fonts. If a device already had data saved from an earlier single-record version of this tool, it migrates automatically the first time the new version loads.

## Known limitations

- **Spanish is a first machine-translated draft.** English and French were reviewed against the source workbook; Spanish should be checked by a native speaker before relying on it in the field.
- **The "hired labour services" list was rebuilt.** The original workbook's French and English versions of that dropdown didn't line up (each row meant something different in each language), so it was rebuilt from the fuller French list with corrected English and Spanish terms rather than copied as-is.
- **Cost-per-kilo vs. cocoa yield use slightly different volume bases**, matching an inconsistency already present in the source workbook's own formulas (yield includes in-kind sharecropper payments, cost-per-kilo doesn't). This is intentional, to keep the numbers consistent with the tool people already trust, not a bug.
- **Confirmation dialogs are custom-built**, not the browser's native popup, because that native popup is unreliable in iOS browsers other than Safari, especially for locally opened files. If a delete action seems unresponsive, look for the in-page confirmation box rather than a system popup.

## Updating the app after making changes

If you edit any file and redeploy, bump the version number in `service-worker.js` (`CACHE_NAME = "cocoa-capture-vX"`). Otherwise devices that already installed the app may keep serving the old cached version rather than picking up the update.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Add to Home Screen" doesn't appear | Not served over HTTPS, or opened in a non-Safari browser on iOS |
| App doesn't work offline after install | Service worker didn't finish caching on first visit — reopen it once while online, then try offline |
| A tapped file opens as a static preview instead of a working app (iPad) | iOS opened it in Quick Look instead of Safari — long-press the file and choose "Open in Safari" |
| Old version still showing after an update | `CACHE_NAME` in `service-worker.js` wasn't bumped, or the device needs to fully close and reopen the app once |
| Delete button seems to do nothing | Should be fixed as of this version — confirms are now an in-page dialog rather than the browser's native popup |
