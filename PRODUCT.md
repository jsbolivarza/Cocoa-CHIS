# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Installable PWA, mobile web, not native. **Tablet is the primary device**: design every surface tablet-first (1180×820 landscape), then adapt down to phone and up to laptop. Phones and Windows/Mac laptops are also used.)

## Users

Fairtrade and cooperative field staff (producer-support coaches, enumerators) who interview cocoa farming households face to face and type the answers in themselves. The farmer does not operate the app. A coach captures many households across a round, often several seasons per farmer, mostly on a tablet, frequently offline, and often doesn't reopen the app for days or weeks between rounds.

## Product Purpose

Capture a cocoa household's income and costs (consent, profile, revenues, costs, labour, household expenditures) and compute results on the device. The data feeds Fairtrade's COSP (Cost of Sustainable Production) and LIRP (Living Income Reference Price) analysis. Success means accurate, complete, consistent household records that reach that analysis intact. On-device results and comparisons support data quality; they aren't the end goal.

## Positioning

A purpose-built, offline-first capture tool for Fairtrade's Living Income methodology. Its calculations mirror the source Excel formulas, it links seasons per farmer, and it never loses an interview half-finished. It's not a generic survey form builder.

## Operating Context

- Interviews happen at the farm or household, often with no connectivity. The app must work fully offline once installed.
- Flow per record: Consent → Profile → Revenues → Costs → Labour → Expenditures → Results (rail order). List screens: Records (grouped by farmer, with season tags), Compare, Export, Settings.
- Data stays on the device (IndexedDB) until it's exported as JSON or CSV and consolidated elsewhere. There's no backend or sync.
- Coaches may get support over the phone. The Settings storage diagnostics exist so someone can read the device's state out loud.
- Seasons use a standardized picklist; `producer_code` is the intended cross-device identifier (still free text).

## Capabilities and Constraints

- Three interface languages: English (source of truth), French, Spanish. Every label has to fit all three.
- Data entry is dense and numeric: repeating tables, money in local currencies, area units, monthly sales.
- Mixed currencies and area units must never be averaged together. The app warns and blanks those averages instead.
- Updates apply only when the coach accepts them, never in the middle of an interview.
- iOS evicts storage for tab-only use, so coaches must install the app to the home screen. The UI warns when it's running in a tab.
- Stack: React + Vite + TypeScript, Zustand, Dexie, vite-plugin-pwa, served from GitHub Pages.
- **The React app (`app-react/`) is the base for every change.** Its fields, calculations (`calc.ts`, ported from the source workbook), variable names and data model are fixed. Design work improves the UX around them (navigation, status, feedback, layout, data-quality cues) and never removes or renames a field or calculated output.
- Undecided: a coop-roster import that would turn `producer_code` into a picklist; how Records scales to around 100 farmers × several seasons.

## Brand Commitments

Fairtrade internal tool. There are no binding Fairtrade brand guidelines (mark, colours, typefaces) to follow.

## Evidence on Hand

- `cocoa_dummy_15_households.json`: dummy household data for testing. It isn't real farmer data and must not be presented as such.
- `design/shell-options/`: app-shell design explorations (options A–G plus remixes).
- No real testimonials, field results or adoption figures exist. Don't fabricate any.

## Product Principles

1. **Data integrity over convenience.** Prevent silent errors (typos fragmenting farmers, mixed-unit averages, lost records) before adding speed.
2. **Never lose an interview.** Offline, eviction, updates and interruptions must all leave captured data intact and visibly saved.
3. **Built for the field, not the desk.** Assume a tablet on a lap or table, bad signal and a farmer waiting. Phone layouts must still work.
4. **Legible to remote support.** Device state and errors should be explainable over a phone call.
5. **Three languages are first-class.** No layout should depend on English string lengths.

## Accessibility & Inclusion

Used outdoors on phones, often in bright light, by staff working in English, French or Spanish. No formal standard has been set yet. WCAG 2.2 AA is the working floor.
