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

A–G use the "Fairtrade Slides" design system; its files are not copied
here (they belong to that design-system artifact). Names, amounts, the
Ghana/cedi context and E's column layout are illustrative placeholders —
check E against the real workbook before building it.

Favoured so far: **D** and **G**, and **F** for farmers answering alone.
