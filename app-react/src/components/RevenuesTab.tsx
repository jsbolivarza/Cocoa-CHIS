/* RevenuesTab.tsx
   Ported from renderRevenuesTab() in docs/js/app.js. The six non-cocoa
   income sections are each gated by a yes/no chip: answering "no" keeps
   the section off screen and out of every total (see calcRevenues), so
   nobody fills in a table just because it is there. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { calcRevenues } from "../lib/calc";
import { REVENUE_SECTIONS, type RevenueFlags } from "../lib/dataModel";
import { KpiCard, StatBox } from "./Kpi";
import { DataTable } from "./DataTable";
import { MonthlySalesTable } from "./MonthlySalesTable";

export function RevenuesTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  const updateField = useAppStore((s) => s.updateField);
  if (!record) return null;
  const r = record.revenues;
  const res = calcRevenues(r);
  const cur = record.meta.currencyUnit;
  const has = r.has || ({} as RevenueFlags);
  const on = (key: keyof RevenueFlags) => has[key] === true;

  // Only the sections the household actually has appear in the strip: a
  // row of zeroes for income sources they told you they do not have is
  // just noise.
  const stripAll: { key: keyof RevenueFlags; labelKey: string; value: number }[] = [
    { key: "coffee", labelKey: "total_coffee_revenue", value: res.totalCoffeeRevenue },
    { key: "otherCashCrops", labelKey: "total_other_cash_crop_revenue", value: res.otherCashCropRevenue },
    { key: "stapleCrops", labelKey: "total_staple_value", value: res.stapleValue },
    { key: "otherFoodCrops", labelKey: "total_other_food_value", value: res.otherFoodValue },
    { key: "livestock", labelKey: "total_livestock_value", value: res.livestockValue },
    { key: "otherIncome", labelKey: "total_other_income", value: res.otherIncome },
  ];
  const strip = stripAll.filter((s) => on(s.key));

  return (
    <div className="panel">
      <div className="kpi-grid">
        <KpiCard accent="night" labelKey="total_cocoa_revenue" value={res.totalCocoaRevenue} lang={lang} unit={cur} />
        <KpiCard accent="eggplant" labelKey="total_cocoa_sales" value={res.cocoa.totalRevenue} lang={lang} unit={cur} />
        <KpiCard accent="mint" labelKey="total_other_cocoa_income" value={res.cocoaOtherIncome} lang={lang} unit={cur} />
      </div>
      {strip.length > 0 && (
        <div className="stat-row">
          {strip.map((s) => (
            <StatBox key={s.key} labelKey={s.labelKey} value={s.value} lang={lang} unit={cur} />
          ))}
        </div>
      )}

      <h3>{t("rev_cocoa_heading", lang)}</h3>
      <p className="section-help">{t("rev_cocoa_help", lang)}</p>
      <MonthlySalesTable arrPath="revenues.cocoaSales" />
      <h4>{t("rev_cocoa_other_heading", lang)}</h4>
      <p className="section-help">{t("rev_cocoa_other_help", lang)}</p>
      <DataTable schemaKey="cocoaOtherIncome" arrPath="revenues.cocoaOtherIncome" />

      <h3>{t("rev_sources_heading", lang)}</h3>
      <p className="section-help">{t("rev_sources_help", lang)}</p>
      <div className="chip-row">
        {REVENUE_SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`chip ${on(s.key) ? "is-on" : ""}`}
            aria-pressed={on(s.key)}
            onClick={() => updateField(`revenues.has.${s.key}`, !on(s.key))}
          >
            {on(s.key) && (
              <span className="chip-check" aria-hidden="true">
                ✓
              </span>
            )}
            {t(s.labelKey, lang)}
          </button>
        ))}
      </div>

      {on("coffee") && (
        <>
          <h3>{t("rev_coffee_heading", lang)}</h3>
          <p className="section-help">{t("rev_coffee_help", lang)}</p>
          <MonthlySalesTable arrPath="revenues.coffeeSales" />
          <div className="stat-row">
            <StatBox labelKey="total_coffee_sales" value={res.coffee.totalRevenue} lang={lang} unit={cur} />
            <StatBox labelKey="total_other_coffee_income" value={res.coffeeOtherIncome} lang={lang} unit={cur} />
          </div>
          <h4>{t("rev_coffee_other_heading", lang)}</h4>
          <DataTable schemaKey="coffeeOtherIncome" arrPath="revenues.coffeeOtherIncome" />
        </>
      )}

      {on("otherCashCrops") && (
        <>
          <h3>{t("rev_cash_crops_heading", lang)}</h3>
          <p className="section-help">{t("rev_cash_crops_help", lang)}</p>
          <DataTable schemaKey="otherCashCrops" arrPath="revenues.otherCashCrops" />
        </>
      )}

      {on("stapleCrops") && (
        <>
          <h3>{t("rev_staple_heading", lang)}</h3>
          <p className="section-help">{t("rev_staple_help", lang)}</p>
          <DataTable schemaKey="stapleCrops" arrPath="revenues.stapleCrops" />
        </>
      )}

      {on("otherFoodCrops") && (
        <>
          <h3>{t("rev_other_food_heading", lang)}</h3>
          <p className="section-help">{t("rev_other_food_help", lang)}</p>
          <DataTable schemaKey="otherFoodCrops" arrPath="revenues.otherFoodCrops" />
        </>
      )}

      {on("livestock") && (
        <>
          <h3>{t("rev_livestock_heading", lang)}</h3>
          <p className="section-help">{t("rev_livestock_help", lang)}</p>
          <DataTable schemaKey="livestock" arrPath="revenues.livestock" />
        </>
      )}

      {on("otherIncome") && (
        <>
          <h3>{t("rev_other_income_heading", lang)}</h3>
          <p className="section-help">{t("rev_other_income_help", lang)}</p>
          <DataTable schemaKey="otherIncome" arrPath="revenues.otherIncome" />
        </>
      )}
    </div>
  );
}
