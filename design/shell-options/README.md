# App shell design options

Design explorations for the overall app shell (navigation, header, step
flow), drawn as phone (390×844) and tablet (1180×820) mockups. Nothing here
is wired into `app-react/` — these are reference boards only.

**Live canvas:** https://claude.ai/artifact/1ALqtoLLsJAa51Tsaujna6 (private
to the owner until shared). The files in this folder are a snapshot of that
canvas; the `.dc.html` files need the canvas runtime (`support.js`) to
render, so open the canvas link to view them.

| Option | Files | Idea |
|---|---|---|
| A · Step rail | `Main`, `A-tablet` | Current shell, refined |
| B · Guided focus | `B-phone`, `B-tablet` | One step at a time, live summary |
| C · Household hub | `C-phone`, `C-tablet` | Overview first, steps as cards |
| D · Money-flow story | `D-phone`, `D-tablet` | The interview is the income waterfall |
| E · Workbook ledger | `E-phone`, `E-tablet` | Closest to the facilitators' Excel workbook |
| F · Conversational | `F-phone` | One question at a time, chat-style |
| G · Pictograms | `G-phone` | Picture tiles for the yes/no income questions |
| Remix D / G / F | `X-*` | Same ideas restyled with taste-skill (brutalist / soft / editorial), free of the Fairtrade slide style |
| **C hub + money flow (tablet)** | `HT0`–`HT9`, `TRail` | The chosen direction, tablet-first, on the React app's real fields (see below) |
| C hub + money flow (phone) | `H0`–`H9` | First phone pass; not yet rebuilt on the real fields |

A–G use the "Fairtrade Slides" design system; its files are not copied
here (they belong to that design-system artifact). Names, amounts, the
Ghana/cedi context and E's column layout are illustrative placeholders —
check E against the real workbook before building it.

The canvas also has Soft G and prototype pages (`Y*`, `Z*`, `T*`, `P*`)
that were never copied into this snapshot.

## Assessment (7 Oct 2026)

Critique of A–G and the remixes against `PRODUCT.md`: 22/40. Full report in
`.impeccable/critique/`; a note per option sits next to each row on the
canvas. Earlier favourites (D, G, F) were picked for farmers answering
alone, but only coaches use the app, so the ranking became **C** (hub),
then E, A, B, with G as a pattern inside steps and D as the Results view.

## Chosen direction: C hub + money flow

`HT*` screens are the tablet set (1180 wide, frame heights show the whole
page). `TRail` is the shared household rail every household screen imports;
it collapses to an icon strip on wide-table steps.

These are **UX enhancements to the React app, not a replacement**. Every
field, label, option list, calculated output and the Whole farm / Cocoa only
results table come from `app-react/` (`*Tab.tsx`, `dataModel.ts`,
`i18n.ts`, `calc.ts`). Added on top:
- hub overview and a status-aware step rail with per-step summaries
- live money flow in the rail; waterfall at the top of Results
- "Doesn't know" markers (never counted as zero; totals read "at least" / "at most")
- implausible-amount warning with Fix / It's correct
- "Offline · Saved hh:mm" and Step N of 5 progress

Amounts are illustrative but internally consistent with `calc.ts`.
