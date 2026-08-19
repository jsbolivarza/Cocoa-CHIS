/* FarmerHistoryScreen.tsx
   New screen, not in the vanilla app: one farmer's seasons side by side.
   Reuses the same building blocks as CompareScreen/CompareChart — the same
   per-record summary applies, just grouped by meta.farmerId (instead of
   showing every different farmer) and ordered by capture date (instead of
   filtered by coop/currency/etc, which don't apply to a single household). */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { compareSummary, type CompareSummary } from "../lib/compare";
import { fmt } from "../lib/format";
import { formatUpdatedAt } from "../lib/recordProgress";
import { CompareChart } from "./CompareChart";

function cell(v: number | null | undefined): string {
  return v == null || !isFinite(v) ? "—" : fmt(v);
}
function negClass(v: number | null | undefined): string {
  return v != null && isFinite(v) && v < 0 ? " negative" : "";
}

const HEAD_KEYS = [
  "col_season", "cmp_cocoa_area", "cmp_yield", "cmp_cost_per_kg", "cmp_price_per_kg",
  "cmp_margin_per_kg", "cmp_net_farm", "cmp_expenditure", "cmp_gap", "cmp_per_person", "cmp_labour_days",
];

export function FarmerHistoryScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const historyFarmerId = useAppStore((s) => s.historyFarmerId);
  const goToList = useAppStore((s) => s.goToList);

  if (!historyFarmerId) return null;
  const list = Object.values(records)
    .filter((r) => r.meta.farmerId === historyFarmerId)
    .map(compareSummary)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!list.length) return null;

  // Money and per-area figures across different currencies or area units
  // are not the same quantity — same guard as CompareScreen, in case a
  // season's units were entered differently from an earlier one.
  const mixedUnits = new Set(list.map((s) => s.currency + "|" + s.areaUnit)).size > 1;

  const avg = (pick: (s: CompareSummary) => number | null | undefined): number | null => {
    const vals = list.map(pick).filter((v): v is number => v != null && isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const avgCell = (pick: (s: CompareSummary) => number | null | undefined, suppressed: boolean): string =>
    suppressed ? "—" : cell(avg(pick));

  const seasonLabel = (s: CompareSummary) => s.season || formatUpdatedAt(s.createdAt);

  return (
    <div className="panel">
      <div className="table-actions">
        <button type="button" className="btn" onClick={goToList}>
          &#8592; {t("btn_my_records", lang)}
        </button>
      </div>
      <h3>{t("farmer_history_heading", lang)}</h3>
      <p className="section-help">{t("farmer_history_help", lang)}</p>
      {mixedUnits && <p className="warn-note">{t("farmer_history_mixed_currency", lang)}</p>}
      <CompareChart list={list} mixedUnits={mixedUnits} lang={lang} />
      <div className="table-wrap compare-table-wrap">
        <table className="data-table results-table compare-table">
          <thead>
            <tr>
              {HEAD_KEYS.map((k, i) => (
                <th key={k} className={i >= 1 ? "num" : undefined}>
                  {t(k, lang)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td className="row-head">{seasonLabel(s)}</td>
                <td className="num">{cell(s.cocoaArea)}</td>
                <td className="num">{cell(s.yieldPerArea)}</td>
                <td className="num">{cell(s.costPerKg)}</td>
                <td className="num">{cell(s.pricePerKg)}</td>
                <td className={`num${negClass(s.marginPerKg)}`}>{cell(s.marginPerKg)}</td>
                <td className={`num${negClass(s.netFarm)}`}>{cell(s.netFarm)}</td>
                <td className="num">{cell(s.expenditure)}</td>
                <td className={`num${negClass(s.gap)}`}>{cell(s.gap)}</td>
                <td className={`num${negClass(s.perPerson)}`}>{cell(s.perPerson)}</td>
                <td className="num">{cell(s.labourDays)}</td>
              </tr>
            ))}
            {list.length > 1 && (
              <tr className="total-row">
                <td className="row-head">
                  {t("compare_avg", lang)} ({list.length})
                </td>
                <td className="num">{avgCell((s) => s.cocoaArea, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.yieldPerArea, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.costPerKg, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.pricePerKg, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.marginPerKg, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.netFarm, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.expenditure, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.gap, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.perPerson, mixedUnits)}</td>
                <td className="num">{avgCell((s) => s.labourDays, false)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
