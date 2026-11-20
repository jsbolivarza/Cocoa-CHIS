/* Kpi.tsx
   Ported from kpiCard()/statBox() in docs/js/app.js. Shared by any tab that
   shows calculated totals (Expenditures now, Results/Compare later). */

import type { ReactNode } from "react";
import { t, type Lang } from "../lib/i18n";
import { fmtUnit } from "../lib/format";
import { useAppStore } from "../store/appStore";

interface ValueProps {
  labelKey: string;
  value: unknown;
  lang: Lang;
  unit?: string;
  /** One short line under the value (a share, a comparison). Never a sentence:
   *  callouts are read while typing, at a glance. */
  note?: ReactNode;
}

function isNegative(value: unknown): boolean {
  return typeof value === "number" && isFinite(value) && value < 0;
}

/** An emphasized card, for the two or three figures a reader looks for first.
 *  Everything else belongs in a StatBox strip: if every number gets a card,
 *  none of them reads as more important than the others. */
export function KpiCard({ accent, labelKey, value, lang, unit, note }: ValueProps & { accent: string }) {
  const currency = useAppStore((s) => s.record?.meta.currencyUnit);
  return (
    <div className={`kpi-card ${accent}`}>
      <div className="kpi-label">{t(labelKey, lang)}</div>
      <div className={`kpi-value${isNegative(value) ? " negative" : ""}`}>
        {fmtUnit(value, unit, currency)}
        {unit ? <small> {unit}</small> : null}
      </div>
      {note ? <div className="kpi-note">{note}</div> : null}
    </div>
  );
}

export function StatBox({ labelKey, value, lang, unit, note }: ValueProps) {
  const currency = useAppStore((s) => s.record?.meta.currencyUnit);
  return (
    <div className="stat-box">
      <div className="stat-label">{t(labelKey, lang)}</div>
      <div className={`stat-value${isNegative(value) ? " negative" : ""}`}>
        {fmtUnit(value, unit, currency)}
        {unit ? " " + unit : ""}
        {note ? <span className="stat-note"> · {note}</span> : null}
      </div>
    </div>
  );
}
