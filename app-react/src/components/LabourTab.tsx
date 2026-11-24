/* LabourTab.tsx
   Ported from renderLabourTab()/renderLabourGrid()/renderLabourPicker() in
   docs/js/app.js. Twelve months of nine columns is the widest table in the
   tool and the one a phone handles worst — stacked it ran to roughly
   twelve screens before a single number existed. So on a phone the months
   become a picker showing one month at a time; wide screens keep the grid,
   where seeing twelve months at once is the point.

   Each month holds up to three service lines, like the workbook's labour
   sheet (three rows per month). A line appears once the line above it has
   a cost, so a month without paid services stays a single row. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { t, optLabel, type Lang } from "../lib/i18n";
import { calcLabour, monthServiceCost, num } from "../lib/calc";
import { fmt } from "../lib/format";
import { useMediaQuery } from "../lib/useMediaQuery";
import { PHONE_QUERY } from "../lib/layout";
import { LABOUR_SERVICE_LINES, type LabourRow, type LabourServiceLine } from "../lib/dataModel";
import { StatBox } from "./Kpi";
import { NumberField, SelectField } from "./fields";

const LABOUR_FIELDS: (keyof LabourRow)[] = [
  "hhDays", "hhDaysCocoa", "hiredDays", "hiredDaysCocoa", "dailyWage", "subsidizedLabour",
  ...LABOUR_SERVICE_LINES.flatMap((l) => [l.type, l.usedFor, l.cost] as (keyof LabourRow)[]),
];

function filled(v: unknown): boolean {
  return v !== "" && v != null;
}

function labourRowHasData(row: LabourRow): boolean {
  return LABOUR_FIELDS.some((k) => filled(row[k]));
}

function lineHasData(row: LabourRow, line: LabourServiceLine): boolean {
  return filled(row[line.type]) || filled(row[line.usedFor]) || filled(row[line.cost]);
}

/** Lines shown for a month: line 1 always, each further line once the line
 *  before it has a cost (JB 24.11.26: a service without a price adds
 *  nothing), or when the line itself already holds data. */
function visibleLines(row: LabourRow): LabourServiceLine[] {
  const out: LabourServiceLine[] = [LABOUR_SERVICE_LINES[0]];
  for (let i = 1; i < LABOUR_SERVICE_LINES.length; i++) {
    if (num(row[LABOUR_SERVICE_LINES[i - 1].cost]) !== 0 || lineHasData(row, LABOUR_SERVICE_LINES[i])) {
      out.push(LABOUR_SERVICE_LINES[i]);
    } else break;
  }
  return out;
}

function labourMonthCost(row: LabourRow): number {
  return num(row.hiredDays) * num(row.dailyWage) + monthServiceCost(row);
}

function DaysCells({ idx, row, lang, span }: { idx: number; row: LabourRow; lang: Lang; span?: number }) {
  return (
    <>
      <td rowSpan={span} data-label={t("col_hh_days", lang)}>
        <NumberField path={`labour.${idx}.hhDays`} value={row.hhDays} />
      </td>
      <td rowSpan={span} data-label={t("col_hh_days_cocoa", lang)}>
        <NumberField path={`labour.${idx}.hhDaysCocoa`} value={row.hhDaysCocoa} />
      </td>
      <td rowSpan={span} data-label={t("col_hired_days", lang)}>
        <NumberField path={`labour.${idx}.hiredDays`} value={row.hiredDays} />
      </td>
      <td rowSpan={span} data-label={t("col_hired_days_cocoa", lang)}>
        <NumberField path={`labour.${idx}.hiredDaysCocoa`} value={row.hiredDaysCocoa} />
      </td>
      <td rowSpan={span} data-label={t("col_daily_wage", lang)}>
        <NumberField path={`labour.${idx}.dailyWage`} value={row.dailyWage} />
      </td>
    </>
  );
}

function ServiceCells({ idx, row, lang, line }: { idx: number; row: LabourRow; lang: Lang; line: LabourServiceLine }) {
  return (
    <>
      <td data-label={t("col_other_service", lang)}>
        <SelectField path={`labour.${idx}.${line.type}`} value={row[line.type]} lang={lang} optionsKey="labour_service_type" wrap />
      </td>
      <td data-label={t("col_service_used_for", lang)}>
        <SelectField path={`labour.${idx}.${line.usedFor}`} value={row[line.usedFor]} lang={lang} staticOptions={["cocoa", "non_cocoa"]} wrap />
      </td>
      <td data-label={t("col_service_cost", lang)}>
        <NumberField path={`labour.${idx}.${line.cost}`} value={row[line.cost]} />
      </td>
    </>
  );
}

function CostCells({ idx, row, lang, span }: { idx: number; row: LabourRow; lang: Lang; span?: number }) {
  return (
    <>
      <td rowSpan={span} className="computed-cell" data-label={t("col_labour_cost", lang)}>
        {fmt(labourMonthCost(row))}
      </td>
      <td rowSpan={span} data-label={t("col_subsidized_labour", lang)}>
        <NumberField path={`labour.${idx}.subsidizedLabour`} value={row.subsidizedLabour} />
      </td>
    </>
  );
}

function LabourGrid({ rows, lang }: { rows: LabourRow[]; lang: Lang }) {
  return (
    <div className="table-wrap">
      <table className="data-table labour-table">
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
        {rows.map((row, idx) => {
          const lines = visibleLines(row);
          const span = lines.length > 1 ? lines.length : undefined;
          return (
            <tbody key={row.month} className="labour-month">
              <tr>
                <td rowSpan={span} className="idx-cell">{optLabel("months", row.month, lang)}</td>
                <DaysCells idx={idx} row={row} lang={lang} span={span} />
                <ServiceCells idx={idx} row={row} lang={lang} line={lines[0]} />
                <CostCells idx={idx} row={row} lang={lang} span={span} />
              </tr>
              {lines.slice(1).map((line) => (
                <tr key={line.type} className="service-line">
                  <ServiceCells idx={idx} row={row} lang={lang} line={line} />
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function LabourPicker({ rows, lang }: { rows: LabourRow[]; lang: Lang }) {
  const [labourMonth, setLabourMonth] = useState(0);
  const month = labourMonth < rows.length ? labourMonth : 0;
  const row = rows[month];
  const filledCount = rows.filter(labourRowHasData).length;
  const lines = visibleLines(row);
  const monthLabel = optLabel("months", row.month, lang);

  return (
    <>
      <div className="month-picker">
        {rows.map((r, idx) => {
          const hasData = labourRowHasData(r);
          return (
            <button
              key={r.month}
              type="button"
              className={`month-chip ${idx === month ? "is-on" : ""} ${hasData ? "has-data" : ""}`}
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
            <tr data-rownum={monthLabel}>
              <DaysCells idx={month} row={row} lang={lang} />
              <CostCells idx={month} row={row} lang={lang} />
            </tr>
            {lines.map((line, i) => (
              <tr key={line.type} data-rownum={`${t("service_line", lang)} ${i + 1}`}>
                <ServiceCells idx={month} row={row} lang={lang} line={line} />
              </tr>
            ))}
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
