/* CompareScreen.tsx
   Ported from renderCompareScreen()/wireCompareFilters() in docs/js/app.js. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppStore } from "../store/appStore";
import { t, type Lang } from "../lib/i18n";
import { compareSummary, type CompareSummary } from "../lib/compare";
import { fmt } from "../lib/format";
import { CompareDistribution } from "./CompareDistribution";
import { useMediaQuery } from "../lib/useMediaQuery";
import { PHONE_QUERY, SIDE_PANEL_QUERY } from "../lib/layout";

interface Filters {
  coop: string;
  programme: string;
  areaUnit: string;
  currency: string;
  season: string;
}
const EMPTY_FILTERS: Filters = { coop: "", programme: "", areaUnit: "", currency: "", season: "" };

/* Table columns: header label and the value each column sorts on. Numbers
   sort highest first on the first click, text A to Z; a second click on the
   same column reverses it. Blanks always go last. */
type SortValue = string | number | null | undefined;
const COLUMNS: { key: string; text?: boolean; value: (s: CompareSummary) => SortValue }[] = [
  { key: "cmp_producer", text: true, value: (s) => s.producer },
  { key: "cmp_coop", text: true, value: (s) => s.coop },
  { key: "col_season", text: true, value: (s) => s.season },
  { key: "cmp_units", text: true, value: (s) => (s.currency || s.areaUnit ? `${s.currency} / ${s.areaUnit}` : "") },
  { key: "cmp_cocoa_area", value: (s) => s.cocoaArea },
  { key: "cmp_yield", value: (s) => s.yieldPerArea },
  { key: "cmp_cocoa_volume", value: (s) => s.cocoaVolume },
  { key: "cmp_cost_per_kg", value: (s) => s.costPerKg },
  { key: "cmp_cocoa_cost", value: (s) => s.cocoaCost },
  { key: "cmp_price_per_kg", value: (s) => s.pricePerKg },
  { key: "cmp_margin_per_kg", value: (s) => s.marginPerKg },
  { key: "cmp_net_cocoa", value: (s) => s.netCocoa },
  { key: "cmp_net_farm", value: (s) => s.netFarm },
  { key: "cmp_cocoa_income_share", value: (s) => s.cocoaIncomeShare },
  { key: "cmp_expenditure", value: (s) => s.expenditure },
  { key: "cmp_gap", value: (s) => s.gap },
  { key: "cmp_per_person", value: (s) => s.perPerson },
  { key: "cmp_labour_days", value: (s) => s.labourDays },
  { key: "cmp_labour_share", value: (s) => s.labourShare },
];

/* Value filter: one number column against a condition, e.g. net cocoa income
   below 0 (a loss) or below the LIRP income share. Households with no value
   in that column drop out while it is on. A new filter starts on "is below"
   with an empty amount, which keeps every household until a number is typed.
   ("is negative / positive" were dropped: they were "below / above 0".) */
type ValueOp = "below" | "above" | "between" | "equal";
interface ValueFilter {
  key: string;
  op: ValueOp;
  amount: string;
  /** Upper end, for "between" only. */
  amount2?: string;
  /** Set by tapping a band of the distribution chart: the upper end is the
   *  next band's lower edge, so it is excluded and the counts match. */
  excludeUpper?: boolean;
}
const VALUE_OPS: { op: ValueOp; labelKey: string }[] = [
  { op: "below", labelKey: "vf_below" },
  { op: "above", labelKey: "vf_above" },
  { op: "between", labelKey: "vf_between" },
  { op: "equal", labelKey: "vf_equal" },
];

function passesValueFilter(s: CompareSummary, vf: ValueFilter | null): boolean {
  const col = vf && COLUMNS.find((c) => c.key === vf.key);
  if (!vf || !col) return true;
  const v = col.value(s);
  if (typeof v !== "number" || !isFinite(v)) return false;
  const amount = parseAmount(vf.amount);
  switch (vf.op) {
    case "above": return isFinite(amount) ? v > amount : true;
    case "below": return isFinite(amount) ? v < amount : true;
    case "equal": {
      // At the precision typed: "45" matches 45.3 (shown as 45 %), "126.67" only 126.67
      if (!isFinite(amount)) return true;
      const decimals = (vf.amount.split(/[.,]/)[1] ?? "").replace(/\D/g, "").length;
      const f = 10 ** Math.min(decimals, 6);
      return Math.round(v * f) === Math.round(amount * f);
    }
    case "between": {
      // Both ends included; an empty end is open, ends typed the wrong way round still work
      const to = parseAmount(vf.amount2 ?? "");
      const lo = isFinite(amount) && isFinite(to) ? Math.min(amount, to) : amount;
      const hi = isFinite(amount) && isFinite(to) ? Math.max(amount, to) : to;
      return (!isFinite(lo) || v >= lo) && (!isFinite(hi) || (vf.excludeUpper ? v < hi : v <= hi));
    }
  }
}

/** Typed amount -> number. Spaces are ignored; a comma is a thousands
 *  separator when it groups digits by three ("2,203,567"), otherwise a
 *  decimal mark ("0,45"). */
function parseAmount(raw: string): number {
  let s = raw.replace(/[\s\u00a0\u202f]/g, "");
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  return s === "" ? NaN : Number(s);
}

function ValueFilterControl({ lang, value, onChange }: { lang: Lang; value: ValueFilter | null; onChange: (v: ValueFilter | null) => void }) {
  const numberCols = COLUMNS.filter((c) => !c.text);
  if (!value) {
    return (
      <label className="filter-chip">
        <span className="filter-chip-label">{t("filter_value", lang)}</span>
        <span className="filter-chip-caret" aria-hidden="true">
          &#9662;
        </span>
        <select aria-label={t("filter_value", lang)} value="" onChange={(e) => e.target.value && onChange({ key: e.target.value, op: "below", amount: "" })}>
          <option value="">{t("filter_value", lang)}</option>
          {numberCols.map((c) => (
            <option key={c.key} value={c.key}>
              {t(c.key, lang)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const isRange = value.op === "between";
  return (
    <span className="value-filter" role="group" aria-label={t("filter_value", lang)}>
      <select className="vf-col" aria-label={t("filter_value", lang)} value={value.key} onChange={(e) => onChange({ ...value, key: e.target.value })}>
        {numberCols.map((c) => (
          <option key={c.key} value={c.key}>
            {t(c.key, lang)}
          </option>
        ))}
      </select>
      <select className="vf-op" aria-label={t("vf_condition", lang)} value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value as ValueOp })}>
        {VALUE_OPS.map((o) => (
          <option key={o.op} value={o.op}>
            {t(o.labelKey, lang)}
          </option>
        ))}
      </select>
      <input
        className="vf-amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={t(isRange ? "vf_from" : "vf_amount", lang)}
        placeholder={isRange ? t("vf_from", lang) : "0"}
        value={value.amount}
        onChange={(e) => onChange({ ...value, amount: e.target.value })}
      />
      {isRange && (
        <>
          <span className="vf-and" aria-hidden="true">–</span>
          <input
            className="vf-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={t("vf_to", lang)}
            placeholder={t("vf_to", lang)}
            value={value.amount2 ?? ""}
            onChange={(e) => onChange({ ...value, amount2: e.target.value, excludeUpper: false })}
          />
        </>
      )}
      <button type="button" className="vf-clear" aria-label={t("vf_clear", lang)} onClick={() => onChange(null)}>
        &times;
      </button>
    </span>
  );
}

interface SortState {
  key: string;
  desc: boolean;
}

function isBlank(v: SortValue): boolean {
  return v == null || v === "" || (typeof v === "number" && !isFinite(v));
}

function sortList(list: CompareSummary[], sort: SortState | null): CompareSummary[] {
  const col = sort && COLUMNS.find((c) => c.key === sort.key);
  if (!sort || !col) return list;
  return [...list].sort((a, b) => {
    const va = col.value(a), vb = col.value(b);
    if (isBlank(va) || isBlank(vb)) return isBlank(va) === isBlank(vb) ? 0 : isBlank(va) ? 1 : -1;
    const order = col.text
      ? String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true })
      : (va as number) - (vb as number);
    return sort.desc ? -order : order;
  });
}

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
function pctCell(v: number | null | undefined): string {
  return v == null || !isFinite(v) ? "—" : `${fmt(Math.round(v))} %`;
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

/* Filters and sorting survive opening a household from the table and
   coming back (the screen unmounts in between); kept for this session only. */
const kept: { filters: Filters; sort: SortState | null; valueFilters: ValueFilter[]; distKey: string; distOpen: boolean } = {
  filters: EMPTY_FILTERS,
  sort: null,
  valueFilters: [],
  distKey: "cmp_net_cocoa", // distribution chart starts on net cocoa income (JB)
  distOpen: false, // iPad: distribution panel closed until opened (kept for the session)
};

export function CompareScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const openRecord = useAppStore((s) => s.openRecord);
  const [filters, setFilters] = useState<Filters>(kept.filters);
  const [sort, setSort] = useState<SortState | null>(kept.sort);
  // Value filters: any number of conditions, all must hold (e.g. net cocoa
  // income below the LIRP income share AND cocoa volume below its threshold).
  const [valueFilters, setValueFilters] = useState<ValueFilter[]>(kept.valueFilters);
  const [distKey, setDistKey] = useState<string>(kept.distKey);
  const [distOpen, setDistOpen] = useState<boolean>(kept.distOpen);
  const isPhone = useMediaQuery(PHONE_QUERY);
  // Landscape iPad and laptop: chart in a side panel beside the table (JB);
  // upright iPad: collapsible strip above it (too narrow for both side by side).
  const hasSide = useMediaQuery(SIDE_PANEL_QUERY);
  useEffect(() => {
    kept.filters = filters;
    kept.sort = sort;
    kept.valueFilters = valueFilters;
    kept.distKey = distKey;
    kept.distOpen = distOpen;
  }, [filters, sort, valueFilters, distKey, distOpen]);
  // A tapped band replaces an earlier band (or range) on the same value,
  // so tapping another band moves the selection instead of narrowing to none.
  const pickBand = (key: string, lo: number | null, hi: number | null) =>
    setValueFilters([
      ...valueFilters.filter((f) => !(f.key === key && f.op === "between")),
      { key, op: "between", amount: lo === null ? "" : String(lo), amount2: hi === null ? "" : String(hi), excludeUpper: true },
    ]);
  const changeValueFilter = (i: number, next: ValueFilter | null) =>
    setValueFilters(next ? valueFilters.map((f, j) => (j === i ? next : f)) : valueFilters.filter((_, j) => j !== i));

  // The table scrolls inside its own box. Its height is fitted to the space
  // left below its top edge, so the box's sideways scrollbar is on screen
  // without scrolling the page (and above the floating menu bar of the
  // grouped look). Re-measured after every render and on resize.
  // With the distribution side panel (landscape iPad, laptop), table box and
  // panel get the same fixed height, so they start and end on one line (JB);
  // a short filtered table keeps the height, a long chart scrolls inside.
  const wrapRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const reserve = document.body.classList.contains("theme-grouped") ? 112 : 32;
      const h = `${Math.max(280, window.innerHeight - top - reserve)}px`;
      el.style.maxHeight = h;
      const side = sideRef.current;
      el.style.height = side ? h : "";
      if (side) side.style.height = h;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });

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
      (!effective.season || s.season === effective.season) &&
      valueFilters.every((vf) => passesValueFilter(s, vf))
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
      {valueFilters.map((vf, i) => (
        <ValueFilterControl key={i} lang={lang} value={vf} onChange={(next) => changeValueFilter(i, next)} />
      ))}
      <ValueFilterControl lang={lang} value={null} onChange={(next) => next && setValueFilters([...valueFilters, next])} />
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

  const sorted = sortList(list, sort);
  const toggleSort = (key: string, text?: boolean) => {
    setSort((cur) => (cur && cur.key === key ? { key, desc: !cur.desc } : { key, desc: !text }));
    // Sort-follow (JB): the distribution chart shows the number column just sorted
    if (!text) setDistKey(key);
  };
  const distribution = (variant: "phone" | "panel" | "strip") => (
    <CompareDistribution
      list={list}
      columns={COLUMNS.filter((c) => !c.text)}
      metricKey={distKey}
      onMetric={setDistKey}
      mixedUnits={mixedUnits}
      lang={lang}
      onPickBand={pickBand}
      onOpen={openRecord}
      variant={variant}
    />
  );

  return (
    <div className="panel">
      <div className="wide-only">
        <h3>{t("compare_heading", lang)}</h3>
        <p className="section-help">{t("compare_help", lang)}</p>
      </div>
      {filterBar}
      {mixedUnits && <p className="warn-note">{t("compare_mixed_currency", lang)}</p>}
      {/* Phone: the chart and its list are the whole view (table hidden).
          iPad: collapsible panel above the table. Desktop: side panel. */}
      {isPhone && distribution("phone")}
      {!isPhone && !hasSide && (
        <details className="cmp-dist-panel" open={distOpen} onToggle={(e) => setDistOpen(e.currentTarget.open)}>
          <summary>{t("dist_panel", lang)}</summary>
          {distribution("strip")}
        </details>
      )}
      <div className={hasSide && !isPhone ? "cmp-desk" : undefined}>
      {hasSide && !isPhone && <aside className="cmp-side" ref={sideRef}>{distribution("panel")}</aside>}
      <div className="table-wrap compare-table-wrap" ref={wrapRef}>
        <table className="data-table results-table compare-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    className={c.text ? undefined : "num"}
                    aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}
                  >
                    <button type="button" className={`sort-btn${active ? " is-on" : ""}`} onClick={() => toggleSort(c.key, c.text)}>
                      {t(c.key, lang)}
                      <span className="sort-icon" aria-hidden="true">
                        {active ? (sort.desc ? "▼" : "▲") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id}>
                <td className="row-head">
                  <button type="button" className="cmp-open" onClick={() => openRecord(s.id)} title={t("btn_open_record", lang)}>
                    {s.producer || t("unnamed_household", lang)}
                  </button>
                </td>
                <td>{s.coop || "—"}</td>
                <td>{s.season || "—"}</td>
                <td>{(s.currency || "—") + " / " + (s.areaUnit || "—")}</td>
                <td className="num">{cell(s.cocoaArea)}</td>
                <td className="num">{cell(s.yieldPerArea)}</td>
                <td className="num">{cell(s.cocoaVolume)}</td>
                <td className="num">{cell(s.costPerKg)}</td>
                <td className="num">{cell(s.cocoaCost)}</td>
                <td className="num">{cell(s.pricePerKg)}</td>
                <td className={`num${negClass(s.marginPerKg)}`}>{cell(s.marginPerKg)}</td>
                <td className={`num${negClass(s.netCocoa)}`}>{cell(s.netCocoa)}</td>
                <td className={`num${negClass(s.netFarm)}`}>{cell(s.netFarm)}</td>
                <td className="num">{pctCell(s.cocoaIncomeShare)}</td>
                <td className="num">{cell(s.expenditure)}</td>
                <td className={`num${negClass(s.gap)}`}>{cell(s.gap)}</td>
                <td className={`num${negClass(s.perPerson)}`}>{cell(s.perPerson)}</td>
                <td className="num">{cell(s.labourDays)}</td>
                <td className="num">{pctCell(s.labourShare)}</td>
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
              <td className="num">{avgCell((s) => s.cocoaVolume, false)}</td>
              <td className="num">{avgCell((s) => s.costPerKg, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.cocoaCost, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.pricePerKg, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.marginPerKg, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.netCocoa, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.netFarm, mixedUnits)}</td>
              <td className="num">{pctCell(avg((s) => s.cocoaIncomeShare))}</td>
              <td className="num">{avgCell((s) => s.expenditure, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.gap, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.perPerson, mixedUnits)}</td>
              <td className="num">{avgCell((s) => s.labourDays, false)}</td>
              <td className="num">{pctCell(avg((s) => s.labourShare))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
      <p className="section-help wide-only">{t("cmp_gap_help", lang)}</p>
    </div>
  );
}
