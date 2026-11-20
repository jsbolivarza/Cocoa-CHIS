/* ResultsTab.tsx
   Ported from renderResultsTab() in docs/js/app.js. */

import { useAppStore } from "../store/appStore";
import { t, type Lang } from "../lib/i18n";
import { calcResults } from "../lib/calc";
import { fmtUnit } from "../lib/format";
import { KpiCard } from "./Kpi";
import { MoneyWaterfall } from "./MoneyWaterfall";
import { incompleteSteps } from "../lib/stepSummary";
import { TAB_LABEL_KEY } from "../lib/tabs";

function ResultsRow({
  labelKey,
  farmVal,
  cocoaVal,
  lang,
  unit,
  total,
}: {
  labelKey: string;
  farmVal: number | null;
  cocoaVal: number | null;
  lang: Lang;
  unit: string;
  total?: boolean;
}) {
  const currency = useAppStore((s) => s.record?.meta.currencyUnit);
  return (
    <tr className={total ? "total-row" : undefined}>
      <td>{t(labelKey, lang)}</td>
      <td className="num" data-label={t("col_whole_farm", lang)}>{farmVal == null ? "" : <>{fmtUnit(farmVal, unit, currency)}<span className="res-unit"> {unit}</span></>}</td>
      <td className="num" data-label={t("col_cocoa_only", lang)}>{cocoaVal == null ? "" : <>{fmtUnit(cocoaVal, unit, currency)}<span className="res-unit"> {unit}</span></>}</td>
      <td className="res-unit-col">{unit}</td>
    </tr>
  );
}

export function ResultsTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  if (!record) return null;
  const res = calcResults(record);
  const cur = record.meta.currencyUnit;
  const area = record.meta.areaUnit;
  const vol = record.meta.volumeUnit;
  const daysUnit = t("days_unit", lang);
  const open = incompleteSteps(record);
  // "Doesn't know" answers per step; the path's first segment is the step.
  const unknownCounts = new Map<string, number>();
  (record.meta.unknownFields || []).forEach((path) => {
    const step = path.split(".", 1)[0];
    if (TAB_LABEL_KEY[step]) unknownCounts.set(step, (unknownCounts.get(step) ?? 0) + 1);
  });
  const unknownByStep = [...unknownCounts.entries()];

  return (
    <div className="panel">
      {/* h2: the step title above is the h1 (no skipped heading level). */}
      <h2 className="panel-heading">{t("results_heading", lang)}</h2>
      <p className="section-help">{t("results_help", lang)}</p>

      {/* Headline cards first: the figures anyone asks for, so the screen
          opens on the farm's result, not on a list of what's unfinished. */}
      <div className="kpi-grid">
        <KpiCard accent="night" labelKey="res_profit" value={res.profitFarm} lang={lang} unit={cur} />
        <KpiCard accent="eggplant" labelKey="res_cost_of_production_kg" value={res.costOfProductionPerKg} lang={lang} unit={`${cur}/${vol}`} />
        <KpiCard accent="mint" labelKey="cmp_price_per_kg" value={res.revenues.cocoa.avgPrice} lang={lang} unit={`${cur}/${vol}`} />
      </div>

      {/* Results open at any time (a coach checks figures mid-interview);
          the note says which steps could still change them. */}
      {open.length > 0 && (
        <div className="results-warning is-compact" role="note">
          <strong>{t("results_incomplete", lang)}</strong> {open.map((tab) => t(TAB_LABEL_KEY[tab], lang)).join(", ")}.{" "}
          {t("results_incomplete_help", lang)}
        </div>
      )}
      {unknownByStep.length > 0 && (
        <div className="results-warning is-compact" role="note">
          <strong>{t("results_unknown", lang)}</strong>{" "}
          {unknownByStep.map(([tab, n]) => `${t(TAB_LABEL_KEY[tab], lang)} (${n})`).join(", ")}.{" "}
          {t("results_unknown_help", lang)}
        </div>
      )}
      <MoneyWaterfall res={res} />

      <div className="table-wrap">
        <table className="data-table results-table">
          <thead>
            <tr>
              <th></th>
              <th>{t("col_whole_farm", lang)}</th>
              <th>{t("col_cocoa_only", lang)}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr className="group-row">
              <td colSpan={4}>{t("res_revenues", lang)}</td>
            </tr>
            <ResultsRow labelKey="res_cocoa_sales" farmVal={res.revenues.totalCocoaRevenue} cocoaVal={res.revenues.totalCocoaRevenue} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_coffee_sales" farmVal={res.revenues.totalCoffeeRevenue} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_other_crop_sales" farmVal={res.revenues.otherCashCropRevenue} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_food_crops" farmVal={res.revenues.foodCropsTotal} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_livestock" farmVal={res.revenues.livestockValue} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_other_income" farmVal={res.revenues.otherIncome} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow total labelKey="res_total_revenues" farmVal={res.totalRevenueFarm} cocoaVal={res.totalRevenueCocoa} lang={lang} unit={cur} />

            <tr className="group-row">
              <td colSpan={4}>{t("res_costs", lang)}</td>
            </tr>
            <ResultsRow labelKey="res_agri_inputs" farmVal={res.costs.inputs.total} cocoaVal={res.costs.inputs.totalCocoa} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_tools" farmVal={res.costs.tools.totalDepreciated} cocoaVal={res.costs.tools.totalDepreciatedCocoa} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_other_costs" farmVal={res.costs.other.total} cocoaVal={res.costs.other.totalCocoa} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_land_costs" farmVal={res.costs.sharecrop.total} cocoaVal={res.costs.sharecrop.totalCocoa} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_hired_labour" farmVal={res.labour.totalLabourCost} cocoaVal={res.labour.totalLabourCostCocoa} lang={lang} unit={cur} />
            <ResultsRow total labelKey="res_total_costs" farmVal={res.totalCostFarm} cocoaVal={res.totalCostCocoa} lang={lang} unit={cur} />

            <tr className="group-row">
              <td colSpan={4}>{t("res_results", lang)}</td>
            </tr>
            <ResultsRow total labelKey="res_profit" farmVal={res.profitFarm} cocoaVal={res.profitCocoa} lang={lang} unit={cur} />
            <ResultsRow labelKey="res_cocoa_yield" farmVal={null} cocoaVal={res.cocoaYieldPerArea} lang={lang} unit={`${vol}/${area}`} />
            <ResultsRow labelKey="res_cost_of_production_area" farmVal={null} cocoaVal={res.costOfProductionPerArea} lang={lang} unit={`${cur}/${area}`} />
            <ResultsRow labelKey="res_cost_of_production_kg" farmVal={null} cocoaVal={res.costOfProductionPerKg} lang={lang} unit={`${cur}/${vol}`} />
            <ResultsRow labelKey="res_household_labour" farmVal={res.labour.totalHhDays} cocoaVal={res.labour.totalHhDaysCocoa} lang={lang} unit={daysUnit} />
            <ResultsRow labelKey="res_return_on_labour" farmVal={res.returnOnLabourFarm} cocoaVal={res.returnOnLabourCocoa} lang={lang} unit={cur} />

            <tr className="group-row">
              <td colSpan={4}>{t("res_household_expenditures", lang)}</td>
            </tr>
            <ResultsRow labelKey="exp_food_heading" farmVal={res.expenditures.food} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="exp_education_heading" farmVal={res.expenditures.education} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="exp_healthcare_heading" farmVal={res.expenditures.healthcare} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow labelKey="exp_other_heading" farmVal={res.expenditures.other} cocoaVal={null} lang={lang} unit={cur} />
            <ResultsRow total labelKey="res_total_expenditures" farmVal={res.expenditures.total} cocoaVal={null} lang={lang} unit={cur} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
