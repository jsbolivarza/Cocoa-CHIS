/* Kpi.tsx
   Ported from kpiCard()/statBox() in docs/js/app.js. Shared by any tab that
   shows calculated totals (Expenditures now, Results/Compare later). */

import { t, type Lang } from "../lib/i18n";
import { fmt } from "../lib/format";

interface ValueProps {
  labelKey: string;
  value: unknown;
  lang: Lang;
  unit?: string;
}

function isNegative(value: unknown): boolean {
  return typeof value === "number" && isFinite(value) && value < 0;
}

/** An emphasized card, for the two or three figures a reader looks for first.
 *  Everything else belongs in a StatBox strip: if every number gets a card,
 *  none of them reads as more important than the others. */
export function KpiCard({ accent, labelKey, value, lang, unit }: ValueProps & { accent: string }) {
  return (
    <div className={`kpi-card ${accent}`}>
      <div className="kpi-label">{t(labelKey, lang)}</div>
      <div className={`kpi-value${isNegative(value) ? " negative" : ""}`}>
        {fmt(value)}
        {unit ? <small> {unit}</small> : null}
      </div>
    </div>
  );
}

export function StatBox({ labelKey, value, lang, unit }: ValueProps) {
  return (
    <div className="stat-box">
      <div className="stat-label">{t(labelKey, lang)}</div>
      <div className={`stat-value${isNegative(value) ? " negative" : ""}`}>
        {fmt(value)}
        {unit ? " " + unit : ""}
      </div>
    </div>
  );
}
