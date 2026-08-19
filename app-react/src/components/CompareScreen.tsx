/* CompareScreen.tsx
   Ported from renderCompareScreen()/wireCompareFilters() in docs/js/app.js. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { t, type Lang } from "../lib/i18n";
import { compareSummary, type CompareSummary } from "../lib/compare";
import { fmt } from "../lib/format";
import { CompareChart } from "./CompareChart";

interface Filters {
  coop: string;
  programme: string;
  areaUnit: string;
  currency: string;
  season: string;
}
const EMPTY_FILTERS: Filters = { coop: "", programme: "", areaUnit: "", currency: "", season: "" };

// Filter options come from the records actually on the device, so a dropdown
// never offers a cooperative or currency nobody captured.
function uniqSorted(summaries: CompareSummary[], key: keyof CompareSummary): string[] {
  const vals = new Set(summaries.map((s) => String(s[key] ?? "").trim()));
  vals.delete("");
  return [...vals].sort();
}

function cell(v: number | null | undefined): string {
  return v == null || !isFinite(v) ? "—" : fmt(v);
}
function negClass(v: number | null | undefined): string {
  return v != null && isFinite(v) && v < 0 ? " negative" : "";
}

// Chips rather than four stacked full-width selects, which used most of a
// phone screen before any data appeared. An active filter shows its value
// and clears on tap; an inactive one stays a compact dropdown.
function FilterChip({
  labelKey,
  lang,
  options,
  value,
  onSelect,
  onClear,
}: {
  labelKey: string;
  lang: Lang;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClear: () => void;
}) {
  if (value) {
    return (
      <button type="button" className="filter-chip is-on" onClick={onClear}>
        {value}
        <span className="chip-x" aria-hidden="true">
          &times;
        </span>
      </button>
    );
  }
  return (
    <label className="filter-chip">
      <span className="filter-chip-label">{t(labelKey, lang)}</span>
      <span className="filter-chip-caret" aria-hidden="true">
        &#9662;
      </span>
      <select aria-label={t(labelKey, lang)} defaultValue="" onChange={(e) => onSelect(e.target.value)}>
        <option value="">{t("filter_all", lang)}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CompareScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const all = Object.values(records);
  if (all.length < 2) {
    return (
      <div className="panel">
        <h3>{t("compare_heading", lang)}</h3>
        <p className="section-help">{t("compare_help", lang)}</p>
        <div className="empty-state">{t("compare_need_more", lang)}</div>
      </div>
    );
  }

  const summaries = all.map(compareSummary);
  const opts = {
    coop: uniqSorted(summaries, "coop"),
    programme: uniqSorted(summaries, "programme"),
    areaUnit: uniqSorted(summaries, "areaUnit"),
    currency: uniqSorted(summaries, "currency"),
    season: uniqSorted(summaries, "season"),
  };

  // Drop any filter whose value no longer exists, e.g. after deleting a record.
  const effective: Filters = { ...filters };
  (Object.keys(effective) as (keyof Filters)[]).forEach((k) => {
    if (effective[k] && !opts[k].includes(effective[k])) effective[k] = "";
  });

  const list = summaries.filter(
    (s) =>
      (!effective.coop || s.coop.trim() === effective.coop) &&
      (!effective.programme || s.programme.trim() === effective.programme) &&
      (!effective.areaUnit || s.areaUnit === effective.areaUnit) &&
      (!effective.currency || s.currency === effective.currency) &&
      (!effective.season || s.season === effective.season)
  );

  const setFilter = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilter = (key: keyof Filters) => setFilters((f) => ({ ...f, [key]: "" }));

  const filterBar = (
    <div className="filter-bar">
      <FilterChip labelKey="filter_season" lang={lang} options={opts.season} value={effective.season} onSelect={(v) => setFilter("season", v)} onClear={() => clearFilter("season")} />
      <FilterChip labelKey="filter_currency" lang={lang} options={opts.currency} value={effective.currency} onSelect={(v) => setFilter("currency", v)} onClear={() => clearFilter("currency")} />
      <FilterChip labelKey="filter_area_unit" lang={lang} options={opts.areaUnit} value={effective.areaUnit} onSelect={(v) => setFilter("areaUnit", v)} onClear={() => clearFilter("areaUnit")} />
      <FilterChip labelKey="filter_coop" lang={lang} options={opts.coop} value={effective.coop} onSelect={(v) => setFilter("coop", v)} onClear={() => clearFilter("coop")} />
      <FilterChip labelKey="filter_programme" lang={lang} options={opts.programme} value={effective.programme} onSelect={(v) => setFilter("programme", v)} onClear={() => clearFilter("programme")} />
      <span className="filter-count">
        {list.length} {t("search_showing", lang)} {summaries.length}
      </span>
    </div>
  );

  if (!list.length) {
    return (
      <div className="panel">
        <h3>{t("compare_heading", lang)}</h3>
        <p className="section-help">{t("compare_help", lang)}</p>
        {filterBar}
        <div className="empty-state">{t("compare_no_match", lang)}</div>
      </div>
    );
  }

  // Money and per-area figures across different currencies or area units are
  // not the same quantity, so averaging them produces a number that means
  // nothing. Blank those averages rather than hand an enumerator a wrong figure.
  const mixedUnits = new Set(list.map((s) => s.currency + "|" + s.areaUnit)).size > 1;

  const avg = (pick: (s: CompareSummary) => number | null | undefined): number | null => {
    const vals = list.map(pick).filter((v): v is number => v != null && isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const avgCell = (pick: (s: CompareSummary) => number | null | undefined, suppressed: boolean): string =>
    suppressed ? "—" : cell(avg(pick));

  const headKeys = [
    "cmp_producer", "cmp_coop", "col_season", "cmp_units", "cmp_cocoa_area", "cmp_yield",
    "cmp_cost_per_kg", "cmp_price_per_kg", "cmp_margin_per_kg", "cmp_net_farm",
    "cmp_expenditure", "cmp_gap", "cmp_per_person", "cmp_labour_days",
  ];

  return (
    <div className="panel">
      <div className="wide-only">
        <h3>{t("compare_heading", lang)}</h3>
        <p className="section-help">{t("compare_help", lang)}</p>
      </div>
      {filterBar}
      {mixedUnits && <p className="warn-note">{t("compare_mixed_currency", lang)}</p>}
      <CompareChart list={list} mixedUnits={mixedUnits} lang={lang} />
      <div className="table-wrap compare-table-wrap">
        <table className="data-table results-table compare-table">
          <thead>
            <tr>
              {headKeys.map((k, i) => (
                <th key={k} className={i >= 4 ? "num" : undefined}>
                  {t(k, lang)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td className="row-head">{s.producer || t("unnamed_household", lang)}</td>
                <td>{s.coop || "—"}</td>
                <td>{s.season || "—"}</td>
                <td>{(s.currency || "—") + " / " + (s.areaUnit || "—")}</td>
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
            <tr className="total-row">
              <td className="row-head">
                {t("compare_avg", lang)} ({list.length})
              </td>
              <td></td>
              <td></td>
              <td></td>
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
          </tbody>
        </table>
      </div>
      <p className="section-help wide-only">{t("cmp_gap_help", lang)}</p>
    </div>
  );
}
