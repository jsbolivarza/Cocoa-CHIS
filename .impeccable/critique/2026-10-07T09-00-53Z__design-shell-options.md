---
target: shell prototypes
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:design/shell-options"
timestamp: 2026-10-07T09-00-53Z
slug: design-shell-options
---
# Critique: design/shell-options (A–G + X remixes)
Method: dual-agent. Prototypes not rendered (canvas runtime); source-read only.

Score 22/40 (Acceptable). H1 3, H2 3, H3 2, H4 2, H5 1, H6 3, H7 2, H8 3, H9 1, H10 2.

Specificity: half. D waterfall, E ledger, C hub are product-specific; A/B/F generic; X remixes are style only. Detector: 25 findings (cramped-padding 7, stripes 4 advisory, dark-glow 3, all-caps-body 3, overused-font 3, clipped-overflow 2, monotonous-spacing 2, side-tab 1); X-D files carry 10; many likely false positives from external design-system tokens.

Priority issues:
- [P0] Favoured shortlist (F, X-F, partly G) judged for farmer self-service; PRODUCT.md says the farmer never operates the app. Re-rank for the coach; reject X-F (Twi, "you" copy, Listen, timer). -> shape
- [P0] D subtracts household spending from income and shows "1 832 below" mid-interview, visible to the farmer. Remove spending from net income; move the gap to Results. -> shape
- [P1] Skips are untracked; no validation or error states mocked (mixed currency, out of range, required). -> harden
- [P1] Targets under 44px (A chips 33px, E inputs 34px, F chips 40px); #9aa0ad at 2.6:1; 11px eyebrows. -> adapt
- [P2] Step count inconsistent (6 vs 7); A's phone rail clipped with no affordance. -> layout

Ranking: C (with A/E entry) > E tablet > A > B > G as an in-step pattern > D as the Results view > F's "Doesn't know" chip only > X-D > X-G > X-F (reject).
