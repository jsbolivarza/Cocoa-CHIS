/* CompareDistribution.tsx
   Phone view of Compare (the table is hidden there): how the households on
   screen are spread over one chosen value, as one bar per band instead of
   one bar per household, which stopped being readable past a few dozen
   (JB 24.11.26, with ~500 households). Bands have round edges; the most
   extreme 2 % at each end go into open bands ("below ..." / "... and more")
   so one outlier cannot squeeze everyone into a single bar. Tapping a band
   filters to its households, listed below 20 at a time; a name opens the
   household. The LIRP benchmark line is left for when benchmarks can be
   set (JB). */

import { useState, type CSSProperties } from "react";
import { t, type Lang } from "../lib/i18n";
import { fmt } from "../lib/format";
import type { CompareSummary } from "../lib/compare";

export interface DistColumn {
  key: string;
  value: (s: CompareSummary) => string | number | null | undefined;
}

/** Values that mean the same in any currency or area unit. */
const UNIT_FREE = new Set(["cmp_labour_share", "cmp_labour_days"]);
/** Money values: the header names the currency only for these. */
const MONEY = new Set([
  "cmp_cost_per_kg", "cmp_cocoa_cost", "cmp_price_per_kg", "cmp_margin_per_kg",
  "cmp_net_cocoa", "cmp_net_farm", "cmp_expenditure", "cmp_gap", "cmp_per_person",
]);
const PAGE = 20;

interface Band {
  lo: number | null; // null = open at the bottom ("below ...")
  hi: number | null; // null = open at the top ("... and more")
  count: number;
}

function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const a = Math.floor(i), b = Math.ceil(i);
  return sorted[a] + (sorted[b] - sorted[a]) * (i - a);
}

/** Round step closest to `raw` (1, 2, 2.5 or 5 times a power of ten), so the
 *  band count stays near the target instead of halving when rounded up. */
function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const steps = [1, 2, 2.5, 5, 10].map((m) => m * mag);
  return steps.reduce((best, s) => (Math.abs(Math.log(s / raw)) < Math.abs(Math.log(best / raw)) ? s : best));
}

function makeBands(sorted: number[], target = 8): Band[] {
  const min = sorted[0], max = sorted[sorted.length - 1];
  if (min === max) return [{ lo: min, hi: max, count: sorted.length }];
  // Range from the 2nd to the 98th percentile once there are enough values
  const from = sorted.length >= 40 ? quantile(sorted, 0.02) : min;
  const to = sorted.length >= 40 ? quantile(sorted, 0.98) : max;
  const step = niceStep((to - from || max - min) / target);
  const round = (x: number) => Math.round(x / step * 1e6) / 1e6 * step;
  const first = round(Math.floor(from / step) * step);
  const n = Math.max(1, Math.ceil((to - first) / step) + (to === first ? 1 : 0));
  const edges = Array.from({ length: n + 1 }, (_, i) => round(first + i * step));
  const bands: Band[] = edges.slice(0, -1).map((lo, i) => ({ lo, hi: edges[i + 1], count: 0 }));
  if (min < edges[0]) bands[0].lo = null;
  if (max >= edges[n]) bands[n - 1].hi = null;
  for (const v of sorted) {
    let i = Math.floor((v - first) / step);
    i = Math.min(Math.max(i, 0), n - 1);
    bands[i].count++;
  }
  return bands;
}

function short(n: number): string {
  const a = Math.abs(n);
  const trim = (x: number) => String(Math.round(x * 10) / 10);
  if (a >= 1e6) return `${trim(n / 1e6)}M`;
  if (a >= 1e4) return `${trim(n / 1e3)}k`;
  return fmt(Math.round(n * 100) / 100);
}

/** "phone": the whole Compare view on a phone, with the household list.
 *  "panel": beside (desktop) or above (iPad) the table, which already lists
 *  the households, so no list; a band tap filters the table. */
export function CompareDistribution({
  list, columns, metricKey, onMetric, mixedUnits, lang, onPickBand, onOpen, variant = "phone",
}: {
  variant?: "phone" | "panel" | "strip";
  list: CompareSummary[];
  columns: DistColumn[];
  metricKey: string;
  onMetric: (key: string) => void;
  mixedUnits: boolean;
  lang: Lang;
  onPickBand: (key: string, lo: number | null, hi: number | null) => void;
  onOpen: (id: string) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const col = columns.find((c) => c.key === metricKey) ?? columns[0];
  const pct = col.key === "cmp_labour_share";
  const unit = (s: string) => (pct ? `${s} %` : s);

  const rows = list
    .map((s) => ({ s, v: col.value(s) }))
    .filter((r): r is { s: CompareSummary; v: number } => typeof r.v === "number" && isFinite(r.v))
    .sort((a, b) => a.v - b.v);
  const values = rows.map((r) => r.v);
  const blocked = mixedUnits && !UNIT_FREE.has(col.key);
  const bands = values.length && !blocked ? makeBands(values) : [];
  const maxCount = Math.max(1, ...bands.map((b) => b.count));
  const median = values.length ? quantile(values, 0.5) : null;
  const currency = MONEY.has(col.key) ? list[0]?.currency : "";

  const bandLabel = (b: Band) =>
    b.lo === null ? `${t("dist_below", lang)} ${unit(short(b.hi as number))}`
    : b.hi === null ? `${unit(short(b.lo))} ${t("dist_and_more", lang)}`
    : b.lo === b.hi ? unit(short(b.lo))
    : `${short(b.lo)} – ${unit(short(b.hi))}`;

  return (
    <div className={variant === "phone" ? "compare-chart cmp-dist" : `cmp-dist is-panel${variant === "strip" ? " is-strip" : ""}`}>
      <label className="cmp-dist-pick">
        <span>{t("dist_value", lang)}</span>
        <select className="field" value={col.key} onChange={(e) => { onMetric(e.target.value); setShown(PAGE); }}>
          {columns.map((c) => (
            <option key={c.key} value={c.key}>{t(c.key, lang)}</option>
          ))}
        </select>
      </label>

      {blocked ? (
        <p className="cmp-callout">{t("dist_mixed", lang)}</p>
      ) : !values.length ? (
        <p className="cmp-callout">{t("compare_no_match", lang)}</p>
      ) : (
        <>
          <div className="cmp-chart-head">
            <span>{[currency, `${values.length} ${t("dist_households", lang)}`].filter(Boolean).join(" · ")}</span>
            {median !== null && <span>{t("dist_median", lang)} {unit(short(median))}</span>}
          </div>
          <div className="cmp-dist-bands" role="list">
            {bands.map((b, i) => {
              const negative = b.hi !== null && b.hi <= 0;
              return (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  className="cmp-dist-band"
                  onClick={() => { onPickBand(col.key, b.lo, b.hi); setShown(PAGE); }}
                  aria-label={`${bandLabel(b)}: ${b.count} ${t("dist_households", lang)}`}
                >
                  <span className="cmp-dist-label">{bandLabel(b)}</span>
                  <span className="cmp-dist-track">
                    <span className={`cmp-dist-fill${negative ? " is-negative" : ""}${b.count ? "" : " is-empty"}`} style={{ "--share": `${(b.count / maxCount) * 100}%` } as CSSProperties} />
                  </span>
                  <span className="cmp-dist-count">{b.count}</span>
                </button>
              );
            })}
          </div>
          <p className="field-hint">{t(variant === "phone" ? "dist_tap_hint" : "dist_tap_hint_table", lang)}</p>
          {variant === "phone" && (
          <>
          <h4 className="cmp-dist-list-title">{t("dist_list_title", lang)}</h4>
          <ol className="cmp-dist-list">
            {rows.slice(0, shown).map(({ s, v }) => (
              <li key={s.id}>
                <button type="button" className="cmp-open" onClick={() => onOpen(s.id)}>
                  {s.producer || t("unnamed_household", lang)}
                </button>
                <span className={`cmp-dist-val${v < 0 ? " negative" : ""}`}>{pct ? `${fmt(Math.round(v))} %` : fmt(v)}</span>
              </li>
            ))}
          </ol>
          {rows.length > shown && (
            <button type="button" className="btn cmp-dist-more" onClick={() => setShown(shown + PAGE)}>
              {t("dist_show_more", lang)} ({shown} / {rows.length})
            </button>
          )}
          </>
          )}
        </>
      )}
    </div>
  );
}
