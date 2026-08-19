/* ExpendituresTab.tsx
   Ported from renderExpendituresTab() in docs/js/app.js. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { calcExpenditures } from "../lib/calc";
import type { ExpenditureCategory } from "../lib/dataModel";
import { NumberField } from "./fields";
import { KpiCard, StatBox } from "./Kpi";

function ExpCategory({ catKey, headingKey, cat }: { catKey: string; headingKey: string; cat: ExpenditureCategory }) {
  const lang = useAppStore((s) => s.currentLang);
  return (
    <>
      <h4>{t(headingKey, lang)}</h4>
      <div className="form-grid form-grid-4">
        <label>
          {t("col_q1", lang)}
          <NumberField path={`expenditures.${catKey}.q1`} value={cat.q1} />
        </label>
        <label>
          {t("col_q2", lang)}
          <NumberField path={`expenditures.${catKey}.q2`} value={cat.q2} />
        </label>
        <label>
          {t("col_q3", lang)}
          <NumberField path={`expenditures.${catKey}.q3`} value={cat.q3} />
        </label>
        <label>
          {t("col_q4", lang)}
          <NumberField path={`expenditures.${catKey}.q4`} value={cat.q4} />
        </label>
      </div>
    </>
  );
}

export function ExpendituresTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  if (!record) return null;
  const exp = record.expenditures;
  const res = calcExpenditures(exp);
  const cur = record.meta.currencyUnit;

  return (
    <div className="panel">
      <div className="kpi-grid">
        <KpiCard accent="night" labelKey="res_total_expenditures" value={res.total} lang={lang} unit={cur} />
      </div>
      <div className="stat-row">
        <StatBox labelKey="exp_food_heading" value={res.food} lang={lang} unit={cur} />
        <StatBox labelKey="exp_education_heading" value={res.education} lang={lang} unit={cur} />
        <StatBox labelKey="exp_healthcare_heading" value={res.healthcare} lang={lang} unit={cur} />
        <StatBox labelKey="exp_other_heading" value={res.other} lang={lang} unit={cur} />
      </div>
      <ExpCategory catKey="food" headingKey="exp_food_heading" cat={exp.food} />
      <ExpCategory catKey="education" headingKey="exp_education_heading" cat={exp.education} />
      <ExpCategory catKey="healthcare" headingKey="exp_healthcare_heading" cat={exp.healthcare} />
      <ExpCategory catKey="other" headingKey="exp_other_heading" cat={exp.other} />
    </div>
  );
}
