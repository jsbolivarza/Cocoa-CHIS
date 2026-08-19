/* CostsTab.tsx
   Ported from renderCostsTab() in docs/js/app.js. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { calcCosts } from "../lib/calc";
import { StatBox } from "./Kpi";
import { DataTable } from "./DataTable";

export function CostsTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  if (!record) return null;
  const res = calcCosts(record.costs);
  const cur = record.meta.currencyUnit;

  return (
    <div className="panel">
      <h3>{t("cost_inputs_heading", lang)}</h3>
      <div className="stat-row">
        <StatBox labelKey="total_inputs_cost" value={res.inputs.total} lang={lang} unit={cur} />
        <StatBox labelKey="total_inputs_cost_cocoa" value={res.inputs.totalCocoa} lang={lang} unit={cur} />
      </div>
      <p className="field-hint">
        {t("cost_used_for_cocoa_help", lang)} {t("subsidy_help", lang)}
      </p>
      <DataTable schemaKey="agriInputs" arrPath="costs.agriInputs" />

      <h3>{t("cost_tools_heading", lang)}</h3>
      <div className="stat-row">
        <StatBox labelKey="total_tools_cost" value={res.tools.total} lang={lang} unit={cur} />
        <StatBox labelKey="total_tools_cost_depreciated" value={res.tools.totalDepreciated} lang={lang} unit={cur} />
        <StatBox labelKey="total_tools_cost_cocoa" value={res.tools.totalDepreciatedCocoa} lang={lang} unit={cur} />
      </div>
      <p className="field-hint">{t("col_lifespan_help", lang)}</p>
      <DataTable schemaKey="tools" arrPath="costs.tools" />

      <h3>{t("cost_other_heading", lang)}</h3>
      <div className="stat-row">
        <StatBox labelKey="total_other_cost" value={res.other.total} lang={lang} unit={cur} />
        <StatBox labelKey="total_other_cost_cocoa" value={res.other.totalCocoa} lang={lang} unit={cur} />
      </div>
      <DataTable schemaKey="otherCosts" arrPath="costs.otherCosts" />

      <h3>{t("cost_sharecrop_heading", lang)}</h3>
      <p className="section-help">{t("cost_sharecrop_help", lang)}</p>
      <div className="stat-row">
        <StatBox labelKey="total_sharecrop_cost" value={res.sharecrop.total} lang={lang} unit={cur} />
        <StatBox labelKey="total_sharecrop_cost_cocoa" value={res.sharecrop.totalCocoa} lang={lang} unit={cur} />
        <StatBox labelKey="total_inkind_cocoa_volume" value={res.sharecrop.inKindCocoaVolume} lang={lang} unit={record.meta.volumeUnit} />
      </div>
      <DataTable schemaKey="sharecropPayments" arrPath="costs.sharecropPayments" />
      <p className="field-hint">{t("inkind_cross_check", lang)}</p>
    </div>
  );
}
