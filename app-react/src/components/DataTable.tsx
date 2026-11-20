/* DataTable.tsx
   Generic repeating-table renderer, ported from renderTable() in
   docs/js/app.js. Every add/remove-row table in the tool (plots, household
   members, cost tables, ...) is driven by one of the TABLE_SCHEMAS in
   dataModel.ts instead of being hand-coded per table. */

import { Fragment, useState } from "react";
import { useAppStore } from "../store/appStore";
import { useMediaQuery } from "../lib/useMediaQuery";
import { WIDE_QUERY, NARROW_WIDE_QUERY } from "../lib/layout";
import { t, type Lang } from "../lib/i18n";
import { getPath } from "../lib/paths";
import { TABLE_SCHEMAS, type TableColumn, type TableRow } from "../lib/dataModel";
import { TextField, NumberField, SelectField } from "./fields";

function ColField({ basePath, col, row, lang }: { basePath: string; col: TableColumn; row: TableRow; lang: Lang }) {
  const path = `${basePath}.${col.key}`;
  const value = row[col.key];
  if (col.type === "index") return null;
  // Shown as not applicable (but never hidden if a value is already there,
  // so no data disappears) when the plot's crop isn't "other crop".
  if (col.key === "otherCropName" && row.crop !== "other_crop" && (value === "" || value == null)) {
    return <span className="field na-cell" aria-label={t(col.labelKey, lang)}>—</span>;
  }
  if (col.type === "select") {
    return (
      <SelectField path={path} value={String(value ?? "")} lang={lang} optionsKey={col.optionsKey ?? null} staticOptions={col.staticOptions} wrap />
    );
  }
  if (col.type === "number") {
    return <NumberField path={path} value={(value as number | "") ?? ""} step={col.step} />;
  }
  return <TextField path={path} value={String(value ?? "")} />;
}

/** Landscape tablet and laptop (>= 1024 px): tables with more than this many
 *  data columns and at least two optional ones move the optional columns
 *  into a per-row "More" detail, so the essential columns fit without
 *  sideways scrolling (design review 20.11.26). Upright tablets show all
 *  columns (a compact "+N" button there was unclear, JB 20.11.26), and so do
 *  phones (rows are cards). To undo entirely: set this to Infinity. */
const DETAIL_ABOVE = 5;

export function DataTable({ schemaKey, arrPath }: { schemaKey: string; arrPath: string }) {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  const addRow = useAppStore((s) => s.addRow);
  const removeRow = useAppStore((s) => s.removeRow);
  const schema = TABLE_SCHEMAS[schemaKey];
  const rows = (record && getPath<TableRow[]>(record, arrPath)) || [];
  const hasIndex = schema.columns.some((c) => c.type === "index");
  const rowWord = t("row_word", lang);
  const wide = useMediaQuery(WIDE_QUERY);
  const narrow = useMediaQuery(NARROW_WIDE_QUERY);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const dataCols = schema.columns.filter((c) => c.type !== "index");
  const useDetail = wide && !narrow && dataCols.length > DETAIL_ABOVE && dataCols.filter((c) => c.optional).length >= 2;
  const mainCols = useDetail ? schema.columns.filter((c) => !c.optional) : schema.columns;
  const detailCols = useDetail ? dataCols.filter((c) => c.optional) : [];
  const filled = (row: TableRow, col: TableColumn) => row[col.key] !== "" && row[col.key] != null;
  const toggle = (idx: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  return (
    <>
      <div className="table-wrap stack-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {mainCols.map((col) =>
                col.type === "index" ? (
                  <th key={col.key} className="col-idx" />
                ) : (
                  <th key={col.key}>
                    {t(col.labelKey, lang)}
                    {col.optional && <span className="opt-badge"> {t("optional_badge", lang)}</span>}
                  </th>
                )
              )}
              {useDetail && <th className="col-more" />}
              <th className="col-remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const nFilled = detailCols.filter((c) => filled(row, c)).length;
              const isOpen = open.has(idx);
              return (
              <Fragment key={idx}>
              <tr data-rownum={hasIndex ? undefined : `${rowWord} ${idx + 1}`} className={isOpen ? "has-detail-open" : undefined}>
                {mainCols.map((col) =>
                  col.type === "index" ? (
                    <td key={col.key} className="idx-cell">
                      <span className="idx-short">{idx + 1}</span>
                      <span className="idx-full">
                        {rowWord} {idx + 1}
                      </span>
                    </td>
                  ) : (
                    <td key={col.key} data-label={col.optional ? `${t(col.labelKey, lang)} · ${t("optional_badge", lang)}` : t(col.labelKey, lang)}>
                      <ColField basePath={`${arrPath}.${idx}`} col={col} row={row} lang={lang} />
                    </td>
                  )
                )}
                {useDetail && (
                  <td className="col-more">
                    {/* Says how many fields are inside and how many are filled,
                        so filled data is never out of sight without a trace. */}
                    <button type="button" className="more-btn" aria-expanded={isOpen} onClick={() => toggle(idx)}>
                      {isOpen ? "−" : "+"} {detailCols.length} {t("dt_more", lang)}
                      {nFilled > 0 && <span className="more-filled"> · {nFilled} {t("dt_filled", lang)}</span>}
                    </button>
                  </td>
                )}
                <td className="col-remove">
                  <button
                    type="button"
                    className="btn-icon"
                    title={t("btn_remove_row", lang)}
                    onClick={() => {
                      setOpen(new Set());
                      removeRow(arrPath, idx);
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
              {useDetail && isOpen && (
                <tr className="detail-row">
                  <td colSpan={mainCols.length + 2}>
                    <div className="row-detail">
                      {detailCols.map((col) => (
                        <label key={col.key} className="row-detail-field">
                          <span>{t(col.labelKey, lang)}</span>
                          <ColField basePath={`${arrPath}.${idx}`} col={col} row={row} lang={lang} />
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-actions">
        <button type="button" className="btn btn-secondary" onClick={() => addRow(schemaKey, arrPath)}>
          + {t("btn_add_row", lang)}
        </button>
      </div>
    </>
  );
}
