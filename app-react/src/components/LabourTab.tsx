/* LabourTab.tsx
   Ported from renderLabourTab()/renderLabourGrid()/renderLabourPicker() in
   docs/js/app.js. Twelve months of nine columns is the widest table in the
   tool and the one a phone handles worst — stacked it ran to roughly
   twelve screens before a single number existed. So on a phone the months
   become a picker showing one month at a time; wide screens keep the grid,
   where seeing twelve months at once is the point. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { t, optLabel, type Lang } from "../lib/i18n";
import { calcLabour, num } from "../lib/calc";
import { fmt } from "../lib/format";
import { useMediaQuery } from "../lib/useMediaQuery";
import { PHONE_QUERY } from "../lib/layout";
import type { LabourRow } from "../lib/dataModel";
import { StatBox } from "./Kpi";
import { NumberField, SelectField } from "./fields";

const LABOUR_FIELDS: (keyof LabourRow)[] = [
  "hhDays", "hhDaysCocoa", "hiredDays", "hiredDaysCocoa",
  "dailyWage", "otherService", "serviceUsedFor", "serviceCost", "subsidizedLabour",
];

function labourRowHasData(row: LabourRow): boolean {
  return LABOUR_FIELDS.some((k) => row[k] !== "" && row[k] != null);
}

function labourMonthCost(row: LabourRow): number {
  return num(row.hiredDays) * num(row.dailyWage) + num(row.serviceCost);
}

function LabourRowFields({ idx, row, lang }: { idx: number; row: LabourRow; lang: Lang }) {
  return (
    <>
      <td data-label={t("col_hh_days", lang)}>
        <NumberField path={`labour.${idx}.hhDays`} value={row.hhDays} />
      </td>
      <td data-label={t("col_hh_days_cocoa", lang)}>
        <NumberField path={`labour.${idx}.hhDaysCocoa`} value={row.hhDaysCocoa} />
      </td>
      <td data-label={t("col_hired_days", lang)}>
        <NumberField path={`labour.${idx}.hiredDays`} value={row.hiredDays} />
      </td>
      <td data-label={t("col_hired_days_cocoa", lang)}>
        <NumberField path={`labour.${idx}.hiredDaysCocoa`} value={row.hiredDaysCocoa} />
      </td>
      <td data-label={t("col_daily_wage", lang)}>
        <NumberField path={`labour.${idx}.dailyWage`} value={row.dailyWage} />
      </td>
      <td data-label={t("col_other_service", lang)}>
        <SelectField path={`labour.${idx}.otherService`} value={row.otherService} lang={lang} optionsKey="labour_service_type" />
      </td>
      <td data-label={t("col_service_used_for", lang)}>
        <SelectField path={`labour.${idx}.serviceUsedFor`} value={row.serviceUsedFor} lang={lang} staticOptions={["cocoa", "non_cocoa"]} />
      </td>
      <td data-label={t("col_service_cost", lang)}>
        <NumberField path={`labour.${idx}.serviceCost`} value={row.serviceCost} />
      </td>
      <td className="computed-cell" data-label={t("col_labour_cost", lang)}>
        {fmt(labourMonthCost(row))}
      </td>
      <td data-label={t("col_subsidized_labour", lang)}>
        <NumberField path={`labour.${idx}.subsidizedLabour`} value={row.subsidizedLabour} />
      </td>
    </>
  );
}

function LabourGrid({ rows, lang }: { rows: LabourRow[]; lang: Lang }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("col_month", lang)}</th>
            <th>{t("col_hh_days", lang)}</th>
            <th>{t("col_hh_days_cocoa", lang)}</th>
            <th>{t("col_hired_days", lang)}</th>
            <th>{t("col_hired_days_cocoa", lang)}</th>
            <th>{t("col_daily_wage", lang)}</th>
            <th>{t("col_other_service", lang)}</th>
            <th>{t("col_service_used_for", lang)}</th>
            <th>{t("col_service_cost", lang)}</th>
            <th>{t("col_labour_cost", lang)}</th>
            <th>{t("col_subsidized_labour", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.month}>
              <td className="idx-cell">{optLabel("months", row.month, lang)}</td>
              <LabourRowFields idx={idx} row={row} lang={lang} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LabourPicker({ rows, lang }: { rows: LabourRow[]; lang: Lang }) {
  const [labourMonth, setLabourMonth] = useState(0);
  const month = labourMonth < rows.length ? labourMonth : 0;
  const row = rows[month];
  const filledCount = rows.filter(labourRowHasData).length;

  return (
    <>
      <div className="month-picker">
        {rows.map((r, idx) => {
          const filled = labourRowHasData(r);
          return (
            <button
              key={r.month}
              type="button"
              className={`month-chip ${idx === month ? "is-on" : ""} ${filled ? "has-data" : ""}`}
              aria-pressed={idx === month}
              onClick={() => setLabourMonth(idx)}
            >
              {optLabel("months", r.month, lang)}
            </button>
          );
        })}
      </div>
      <p className="field-hint month-picker-count">
        {filledCount} / {rows.length} {t("months_filled_label", lang)}
      </p>
      <div className="table-wrap stack-wrap">
        <table className="data-table">
          <tbody>
            <tr data-rownum={optLabel("months", row.month, lang)}>
              <LabourRowFields idx={month} row={row} lang={lang} />
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function LabourTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  const isPhone = useMediaQuery(PHONE_QUERY);
  if (!record) return null;
  const rows = record.labour;
  const res = calcLabour(rows);
  const cur = record.meta.currencyUnit;

  return (
    <div className="panel">
      <h3>{t("labour_heading", lang)}</h3>
      <p className="section-help">{t("labour_help_days", lang)}</p>
      <div className="stat-row">
        <StatBox labelKey="labour_total" value={res.totalLabourCost} lang={lang} unit={cur} />
        <StatBox labelKey="labour_cost_cocoa" value={res.totalLabourCostCocoa} lang={lang} unit={cur} />
        <StatBox labelKey="col_daily_wage" value={res.avgDailyWage} lang={lang} unit={cur} />
        <StatBox labelKey="col_subsidized_labour" value={res.subsidizedLabour} lang={lang} unit={cur} />
      </div>
      <p className="season-note">{t("season_note", lang)}</p>
      {isPhone ? <LabourPicker rows={rows} lang={lang} /> : <LabourGrid rows={rows} lang={lang} />}
      <p className="field-hint">{t("other_service_help", lang)}</p>
    </div>
  );
}
