/* CompareChart.tsx
   Ported from renderCompareChart() in docs/js/app.js. A diverging bar of net
   farm income minus household expenditure, worst first, so a coach reading
   top-to-bottom sees the households needing attention first. */

import { t, type Lang } from "../lib/i18n";
import { fmt } from "../lib/format";
import type { CompareSummary } from "../lib/compare";

export function CompareChart({ list, mixedUnits, lang }: { list: CompareSummary[]; mixedUnits: boolean; lang: Lang }) {
  // Bars drawn across currencies are meaningless: 600 XOF and 10 GHS on one
  // scale flattens every GHS bar to nothing. The warning above the table
  // says to filter instead.
  if (mixedUnits) return null;
  const usable = list
    .filter((s) => s.gap != null && isFinite(s.gap))
    .slice()
    .sort((a, b) => a.gap - b.gap);
  if (!usable.length) return null;

  const values = usable.map((s) => s.gap);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  // Where zero sits across the track, so bars share one scale either side.
  const zeroPct = (-lo / span) * 100;
  const widthPct = (v: number) => (Math.abs(v) / span) * 100;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgPct = ((avg - lo) / span) * 100;
  const shortfall = values.filter((v) => v < 0).length;
  const currency = usable[0].currency || "";

  return (
    <div className="compare-chart">
      <div className="cmp-chart-head">
        <span>
          {currency} · {t("cmp_worst_first", lang)}
        </span>
        <span>
          {usable.length} {t("search_showing", lang)} {list.length}
        </span>
      </div>
      <div className="cmp-plot">
        <span className="cmp-zero" style={{ left: `${zeroPct.toFixed(2)}%` }} />
        <span className="cmp-avg" style={{ left: `${avgPct.toFixed(2)}%` }} />
        {usable.map((s) => {
          const negative = s.gap < 0;
          return (
            <div className="cmp-bar-row" key={s.id}>
              <div className="cmp-bar-head">
                <span className="cmp-bar-name">{s.producer || t("unnamed_household", lang)}</span>
                <span className={`cmp-bar-val ${negative ? "negative" : "positive"}`}>{fmt(s.gap)}</span>
              </div>
              <div className="cmp-bar-track">
                {negative ? (
                  <span
                    className="cmp-bar-fill is-negative"
                    style={{ right: `${(100 - zeroPct).toFixed(2)}%`, width: `${widthPct(s.gap).toFixed(2)}%` }}
                  />
                ) : (
                  <span className="cmp-bar-fill" style={{ left: `${zeroPct.toFixed(2)}%`, width: `${widthPct(s.gap).toFixed(2)}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="cmp-legend">
        <span>
          <i className="swatch negative" />
          {t("cmp_legend_shortfall", lang)}
        </span>
        <span>
          <i className="swatch avg-line" />
          {t("compare_avg", lang)} {fmt(avg)}
        </span>
      </div>
      <p className="cmp-callout">
        {shortfall} {t("search_showing", lang)} {usable.length} {t("cmp_shortfall_count", lang)}
      </p>
    </div>
  );
}
