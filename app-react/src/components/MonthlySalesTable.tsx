/* MonthlySalesTable.tsx
   Ported from renderMonthlySalesTable() in docs/js/app.js, then extended
   with a phone-only month picker (not in the vanilla app) — requested
   because cocoa/coffee sales are the two longest monthly tables to fill in
   on a phone. Same split as LabourTab: a picker showing one month at a
   time on phones, the full grid everywhere else. Desktop keeps the
   original expand/collapse-hidden-months behavior unchanged. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { t, optLabel, type Lang } from "../lib/i18n";
import { getPath } from "../lib/paths";
import { num } from "../lib/calc";
import { fmt } from "../lib/format";
import { useMediaQuery } from "../lib/useMediaQuery";
import { PHONE_QUERY } from "../lib/layout";
import type { MonthSalesRow } from "../lib/dataModel";
import { NumberField } from "./fields";

function MonthSalesGrid({ arrPath, rows, lang }: { arrPath: string; rows: MonthSalesRow[]; lang: Lang }) {
  const [expanded, setExpanded] = useState(false);

  const indexed = rows.map((row, idx) => ({ row, idx }));
  const filled = indexed.filter(({ row }) => num(row.volume) || num(row.price));
  const visible = expanded || !filled.length ? indexed : filled;
  const visibleIdx = new Set(visible.map((v) => v.idx));
  const hiddenCount = rows.length - visible.length;
  const hiddenRevenue = rows.reduce(
    (s, row, idx) => (visibleIdx.has(idx) ? s : s + num(row.volume) * num(row.price)),
    0
  );
  const showLess = expanded && filled.length > 0 && filled.length < rows.length;

  return (
    <div className="table-wrap stack-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("col_month", lang)}</th>
            <th>{t("col_volume_sold", lang)}</th>
            <th>{t("col_price_per_kilo", lang)}</th>
            <th>{t("col_revenue", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ row, idx }) => {
            const revenue = num(row.volume) * num(row.price);
            return (
              <tr key={row.month}>
                <td className="idx-cell">{optLabel("months", row.month, lang)}</td>
                <td data-label={t("col_volume_sold", lang)}>
                  <NumberField path={`${arrPath}.${idx}.volume`} value={row.volume} />
                </td>
                <td data-label={t("col_price_per_kilo", lang)}>
                  <NumberField path={`${arrPath}.${idx}.price`} value={row.price} />
                </td>
                <td className="computed-cell" data-label={t("col_revenue", lang)}>
                  {fmt(revenue)}
                </td>
              </tr>
            );
          })}
          {hiddenCount > 0 && (
            <tr className="months-more" onClick={() => setExpanded(true)}>
              <td colSpan={3}>
                {hiddenCount} {t("months_more", lang)}
              </td>
              <td className="computed-cell">{fmt(hiddenRevenue)}</td>
            </tr>
          )}
          {showLess && (
            <tr className="months-more" onClick={() => setExpanded(false)}>
              <td colSpan={4}>{t("months_less", lang)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* Same picker pattern as LabourTab's renderLabourPicker(): every month is a
   chip (filled ones marked), tapping one shows just that month's fields
   below, so filling in eleven blank months is eleven taps instead of
   eleven screens of scrolling. */
function MonthSalesPicker({ arrPath, rows, lang }: { arrPath: string; rows: MonthSalesRow[]; lang: Lang }) {
  const [month, setMonth] = useState(0);
  const idx = month < rows.length ? month : 0;
  const row = rows[idx];
  const revenue = num(row.volume) * num(row.price);
  const filledCount = rows.filter((r) => num(r.volume) || num(r.price)).length;

  return (
    <>
      <div className="month-picker">
        {rows.map((r, i) => {
          const filled = num(r.volume) || num(r.price);
          return (
            <button
              key={r.month}
              type="button"
              className={`month-chip ${i === idx ? "is-on" : ""} ${filled ? "has-data" : ""}`}
              aria-pressed={i === idx}
              onClick={() => setMonth(i)}
            >
              {optLabel("months", r.month, lang)}
            </button>
          );
        })}
      </div>
      <p className="field-hint month-picker-count">
        {filledCount} / {rows.length} {t("months_sales_filled_label", lang)}
      </p>
      <div className="table-wrap stack-wrap">
        <table className="data-table">
          <tbody>
            <tr data-rownum={optLabel("months", row.month, lang)}>
              <td data-label={t("col_volume_sold", lang)}>
                <NumberField path={`${arrPath}.${idx}.volume`} value={row.volume} />
              </td>
              <td data-label={t("col_price_per_kilo", lang)}>
                <NumberField path={`${arrPath}.${idx}.price`} value={row.price} />
              </td>
              <td className="computed-cell" data-label={t("col_revenue", lang)}>
                {fmt(revenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function MonthlySalesTable({ arrPath }: { arrPath: string }) {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const rows = (record && getPath<MonthSalesRow[]>(record, arrPath)) || [];

  return (
    <>
      <p className="season-note">{t("season_note", lang)}</p>
      {isPhone ? <MonthSalesPicker arrPath={arrPath} rows={rows} lang={lang} /> : <MonthSalesGrid arrPath={arrPath} rows={rows} lang={lang} />}
    </>
  );
}
