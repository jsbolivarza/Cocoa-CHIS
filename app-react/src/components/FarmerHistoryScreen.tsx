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
import { useMediaQuery } from "../lib/useMediaQuery";
import { WIDE_QUERY } from "../lib/layout";
import type { Lang } from "../lib/i18n";

/* ---------- phone: one callout per figure instead of chart + table ----------
   On a phone the question is "what changed since last season?", which the
   bar chart (built for comparing many households) didn't answer and the
   wide table couldn't show. Each card: the newest season large, earlier
   seasons below, the change, and the amber "check with farmer" chip for a
   jump worth confirming (placeholder limits, as on the overview card). */
type Pick = (s: CompareSummary) => number | null | undefined;
interface Fig {
  key: string;
  labelKey: string;
  pick: Pick;
  unit: (s: CompareSummary) => string;
  /** Money that can be negative: show the difference, not a %. */
  absolute?: boolean;
  checkAt: number;
  /** Not comparable across currencies / area units. */
  unitBound: boolean;
}
const FIGS: Fig[] = [
  { key: "net", labelKey: "cmp_net_farm", pick: (s) => s.netFarm, unit: (s) => s.currency, absolute: true, checkAt: 0.5, unitBound: true },
  { key: "gap", labelKey: "cmp_gap", pick: (s) => s.gap, unit: (s) => s.currency, absolute: true, checkAt: 0.5, unitBound: true },
  { key: "yield", labelKey: "cmp_yield", pick: (s) => s.yieldPerArea, unit: (s) => `${s.volumeUnit}/${s.areaUnit}`, checkAt: 0.25, unitBound: true },
  { key: "price", labelKey: "cmp_price_per_kg", pick: (s) => s.pricePerKg, unit: (s) => `${s.currency}/${s.volumeUnit}`, checkAt: 0.25, unitBound: true },
  { key: "cost", labelKey: "cmp_cost_per_kg", pick: (s) => s.costPerKg, unit: (s) => `${s.currency}/${s.volumeUnit}`, checkAt: 0.25, unitBound: true },
  { key: "margin", labelKey: "cmp_margin_per_kg", pick: (s) => s.marginPerKg, unit: (s) => `${s.currency}/${s.volumeUnit}`, absolute: true, checkAt: 0.5, unitBound: true },
  { key: "area", labelKey: "cmp_cocoa_area", pick: (s) => s.cocoaArea, unit: (s) => s.areaUnit, checkAt: 0.25, unitBound: true },
  { key: "spend", labelKey: "cmp_expenditure", pick: (s) => s.expenditure, unit: (s) => s.currency, checkAt: 0.5, unitBound: true },
  { key: "person", labelKey: "cmp_per_person", pick: (s) => s.perPerson, unit: (s) => s.currency, absolute: true, checkAt: 0.5, unitBound: true },
  { key: "days", labelKey: "cmp_labour_days", pick: (s) => s.labourDays, unit: () => "", checkAt: 0.5, unitBound: false },
];

const ok = (v: number | null | undefined): v is number => v != null && isFinite(v);

function SeasonCallouts({ list, lang, label }: { list: CompareSummary[]; lang: Lang; label: (s: CompareSummary) => string }) {
  const cur = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2] : null;
  const earlier = list.slice(0, -1);
  const sameUnits = !!prev && prev.currency === cur.currency && prev.areaUnit === cur.areaUnit && prev.volumeUnit === cur.volumeUnit;
  return (
    <div className="season-callouts">
      {FIGS.map((f) => {
        const v = f.pick(cur);
        const p = prev ? f.pick(prev) : null;
        const comparable = ok(v) && ok(p) && (!f.unitBound || sameUnits);
        let change = "";
        let check = false;
        if (comparable) {
          const d = v - p;
          const share = p !== 0 ? d / Math.abs(p) : null;
          const same = f.absolute || share == null ? d === 0 : Math.round(share * 100) === 0;
          if (same) change = t("sc_no_change", lang);
          else if (f.absolute || share == null) change = `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`;
          else change = `${share > 0 ? "+" : "−"}${Math.abs(Math.round(share * 100))} %`;
          check = share != null && Math.abs(share) >= f.checkAt;
        }
        const unit = f.unit(cur);
        return (
          <div key={f.key} className="season-callout">
            <div className="sc-label">{t(f.labelKey, lang)}</div>
            <div className={`sc-value${ok(v) && v < 0 ? " negative" : ""}`}>
              {cell(v)}
              {unit && ok(v) ? <small> {unit}</small> : null}
            </div>
            {earlier.length > 0 && (
              <div className="sc-prev">
                {earlier.map((s) => `${label(s)}: ${cell(f.pick(s))}`).join(" · ")}
              </div>
            )}
            {change && (
              <div className="sc-change">
                {check ? <span className="check-chip">{change} · {t("hub_check", lang)}</span> : <span className={change === t("sc_no_change", lang) ? "sc-flat" : undefined}>{change}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const wide = useMediaQuery(WIDE_QUERY);
  const goToList = useAppStore((s) => s.goToList);
  const openRecord = useAppStore((s) => s.openRecord);
  const currentTab = useAppStore((s) => s.currentTab);
  // openFarmerHistory() leaves the open household in the store.
  const fromRecord = useAppStore((s) => s.record);

  if (!historyFarmerId) return null;
  const list = Object.values(records)
    .filter((r) => r.meta.farmerId === historyFarmerId)
    .map(compareSummary)
    // Season order ("2024/2025" < "2025/2026"), not capture order: a season
    // entered late must not show up as the newest. Unlabelled ones by date.
    .sort((a, b) => (a.season && b.season ? a.season.localeCompare(b.season) : a.createdAt.localeCompare(b.createdAt)));
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
        {/* Opened from inside a household (hub card, phone header chip):
            go back to that household first; My records stays as the
            second way out. From the Records list there is no household. */}
        {fromRecord && (
          <button type="button" className="btn btn-secondary" onClick={() => openRecord(fromRecord.meta.id, currentTab)}>
            &#8592; {t("btn_back_household", lang)}
          </button>
        )}
        <button type="button" className="btn" onClick={goToList}>
          {fromRecord ? "" : "← "}
          {t("btn_my_records", lang)}
        </button>
      </div>
      <h3>{t("farmer_history_heading", lang)}</h3>
      <p className="section-help">{t("farmer_history_help", lang)}</p>
      {mixedUnits && <p className="warn-note">{t("farmer_history_mixed_currency", lang)}</p>}
      {!wide && list.length > 0 && (
        <>
          <p className="sc-season">{seasonLabel(list[list.length - 1])}</p>
          <SeasonCallouts list={list} lang={lang} label={seasonLabel} />
        </>
      )}
      {wide && <CompareChart list={list} mixedUnits={mixedUnits} lang={lang} barLabel={seasonLabel} />}
      {wide && <div className="table-wrap compare-table-wrap">
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
      </div>}
    </div>
  );
}
