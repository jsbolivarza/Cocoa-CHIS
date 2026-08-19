/* DataTable.tsx
   Generic repeating-table renderer, ported from renderTable() in
   docs/js/app.js. Every add/remove-row table in the tool (plots, household
   members, cost tables, ...) is driven by one of the TABLE_SCHEMAS in
   dataModel.ts instead of being hand-coded per table. */

import { useAppStore } from "../store/appStore";
import { t, type Lang } from "../lib/i18n";
import { getPath } from "../lib/paths";
import { TABLE_SCHEMAS, type TableColumn, type TableRow } from "../lib/dataModel";
import { TextField, NumberField, SelectField } from "./fields";

function ColField({ basePath, col, row, lang }: { basePath: string; col: TableColumn; row: TableRow; lang: Lang }) {
  const path = `${basePath}.${col.key}`;
  const value = row[col.key];
  if (col.type === "index") return null;
  if (col.type === "select") {
    return (
      <SelectField path={path} value={String(value ?? "")} lang={lang} optionsKey={col.optionsKey ?? null} staticOptions={col.staticOptions} />
    );
  }
  if (col.type === "number") {
    return <NumberField path={path} value={(value as number | "") ?? ""} step={col.step} />;
  }
  return <TextField path={path} value={String(value ?? "")} />;
}

export function DataTable({ schemaKey, arrPath }: { schemaKey: string; arrPath: string }) {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  const addRow = useAppStore((s) => s.addRow);
  const removeRow = useAppStore((s) => s.removeRow);
  const schema = TABLE_SCHEMAS[schemaKey];
  const rows = (record && getPath<TableRow[]>(record, arrPath)) || [];
  const hasIndex = schema.columns.some((c) => c.type === "index");
  const rowWord = t("row_word", lang);

  return (
    <>
      <div className="table-wrap stack-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {schema.columns.map((col) =>
                col.type === "index" ? (
                  <th key={col.key} className="col-idx" />
                ) : (
                  <th key={col.key}>
                    {t(col.labelKey, lang)}
                    {col.optional && <span className="opt-badge"> {t("optional_badge", lang)}</span>}
                  </th>
                )
              )}
              <th className="col-remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} data-rownum={hasIndex ? undefined : `${rowWord} ${idx + 1}`}>
                {schema.columns.map((col) =>
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
                <td className="col-remove">
                  <button type="button" className="btn-icon" title={t("btn_remove_row", lang)} onClick={() => removeRow(arrPath, idx)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
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
