/* MoneyWaterfall.tsx
   Top of Results (design/shell-options/HT9-results), drawn left to right:
   revenues stacked up, costs taken off, profit left — the same figures as the results table
   below, drawn so the household can follow them. Household spending is
   kept out of the waterfall and compared with profit in its own block,
   because calcResults() computes profit as revenues minus costs only. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import type { calcResults } from "../lib/calc";
import { fmt } from "../lib/format";

type Results = ReturnType<typeof calcResults>;
type Row = { labelKey: string; value: number; tab?: string; kind: "in" | "out" | "total" | "net" };

export function MoneyWaterfall({ res }: { res: Results }) {
  const lang = useAppStore((s) => s.currentLang);
  const switchTab = useAppStore((s) => s.switchTab);
  const [view, setView] = useState<"farm" | "cocoa">("farm");
  const cocoa = view === "cocoa";

  const revenueRows: Row[] = cocoa
    ? [{ labelKey: "res_cocoa_sales", value: res.revenues.totalCocoaRevenue, tab: "revenues", kind: "in" }]
    : [
        { labelKey: "res_cocoa_sales", value: res.revenues.totalCocoaRevenue, tab: "revenues", kind: "in" },
        { labelKey: "res_coffee_sales", value: res.revenues.totalCoffeeRevenue, tab: "revenues", kind: "in" },
        { labelKey: "res_other_crop_sales", value: res.revenues.otherCashCropRevenue, tab: "revenues", kind: "in" },
        { labelKey: "res_food_crops", value: res.revenues.foodCropsTotal, tab: "revenues", kind: "in" },
        { labelKey: "res_livestock", value: res.revenues.livestockValue, tab: "revenues", kind: "in" },
        { labelKey: "res_other_income", value: res.revenues.otherIncome, tab: "revenues", kind: "in" },
      ];
  const costRows: Row[] = [
    { labelKey: "res_agri_inputs", value: cocoa ? res.costs.inputs.totalCocoa : res.costs.inputs.total, tab: "costs", kind: "out" },
    { labelKey: "res_tools", value: cocoa ? res.costs.tools.totalDepreciatedCocoa : res.costs.tools.totalDepreciated, tab: "costs", kind: "out" },
    { labelKey: "res_other_costs", value: cocoa ? res.costs.other.totalCocoa : res.costs.other.total, tab: "costs", kind: "out" },
    { labelKey: "res_land_costs", value: cocoa ? res.costs.sharecrop.totalCocoa : res.costs.sharecrop.total, tab: "costs", kind: "out" },
    { labelKey: "res_hired_labour", value: cocoa ? res.labour.totalLabourCostCocoa : res.labour.totalLabourCost, tab: "labour", kind: "out" },
  ];
  const totalRevenue = cocoa ? res.totalRevenueCocoa : res.totalRevenueFarm;
  const profit = cocoa ? res.profitCocoa : res.profitFarm;

  const rows: Row[] = [
    ...revenueRows.filter((r) => r.value),
    { labelKey: "res_total_revenues", value: totalRevenue, kind: "total" },
    ...costRows.filter((r) => r.value),
    { labelKey: "res_profit", value: profit, kind: "net" },
  ];

  // Each column floats between the running total before and after it, so
  // the eye walks left to right from revenues down to profit. The domain
  // includes 0 and any negative running total, so a loss reads below the base.
  let run = 0;
  const spans = rows.map((r) => {
    if (r.kind === "in") { const a = run; run += r.value; return [a, run]; }
    if (r.kind === "out") { const a = run; run -= r.value; return [run, a]; }
    return [Math.min(0, r.value), Math.max(0, r.value)];
  });
  const lo = Math.min(0, ...spans.map((s) => s[0]));
  const hi = Math.max(1, ...spans.map((s) => s[1]));
  const y = (v: number) => ((v - lo) / (hi - lo)) * 100;

  const spending = res.expenditures.total;
  const sign = (r: Row) => (r.kind === "in" ? "+ " : r.kind === "out" ? "− " : "");

  return (
    <div className="waterfall-grid">
      <section className="wf-card">
        <div className="wf-head">
          <h2>{t("waterfall_heading", lang)}</h2>
          <div className="wf-toggle" role="group" aria-label={t("waterfall_heading", lang)}>
            <button type="button" aria-pressed={!cocoa} onClick={() => setView("farm")}>{t("col_whole_farm", lang)}</button>
            <button type="button" aria-pressed={cocoa} onClick={() => setView("cocoa")}>{t("col_cocoa_only", lang)}</button>
          </div>
        </div>
        <div className="wf-legend" aria-hidden="true">
          <span><i className="is-in" />{t("res_revenues", lang)}</span>
          <span><i className="is-out" />{t("res_costs", lang)}</span>
          <span><i className="is-total" />{t("res_total_revenues", lang)} · {t("res_profit", lang)}</span>
        </div>
        <div className="wf-chart" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(min-content, 1fr))` }}>
          {rows.map((r, i) => {
            const [a, b] = spans[i];
            const kind = r.kind === "net" && r.value < 0 ? "neg" : r.kind;
            const label = t(r.labelKey, lang);
            const value = `${sign(r)}${fmt(r.value)}`;
            const col = (
              <>
                <span className="wf-plot">
                  {lo < 0 && <span className="wf-zero" style={{ bottom: `${y(0)}%` }} />}
                  <span className={`wf-bar is-${kind}`} style={{ bottom: `${y(a)}%`, height: `${Math.max(0.6, y(b) - y(a))}%` }}>
                    <span className="wf-value num">{value}</span>
                  </span>
                </span>
                <span className={`wf-label${r.kind === "total" || r.kind === "net" ? " is-strong" : ""}`}>{label}</span>
              </>
            );
            return r.tab ? (
              <button key={r.labelKey} type="button" className="wf-col" title={`${label}: ${value}`} onClick={() => switchTab(r.tab!)}>{col}</button>
            ) : (
              <div key={r.labelKey} className="wf-col" title={`${label}: ${value}`}>{col}</div>
            );
          })}
        </div>
      </section>

      {!cocoa && (
        <section className="wf-card">
          <h2>{t("waterfall_spending_heading", lang)}</h2>
          <div className="wf-row is-total"><span>{t("res_profit", lang)}</span><span className="num">{fmt(res.profitFarm)}</span></div>
          <button type="button" className="wf-row is-out" onClick={() => switchTab("expenditures")}>
            <span>− {t("res_total_expenditures", lang)}</span><span className="num">{fmt(spending)}</span>
          </button>
          <div className={`wf-row is-net${res.profitFarm - spending < 0 ? " is-negative" : ""}`}>
            <span>{t("cmp_gap", lang)}</span><span className="num">{fmt(res.profitFarm - spending)}</span>
          </div>
          <p className="section-help">{t("cmp_gap_help", lang)}</p>
        </section>
      )}
    </div>
  );
}
