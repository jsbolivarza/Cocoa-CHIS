/* RecordsScreen.tsx
   Ported from renderRecordsScreen() in docs/js/app.js. The search box itself
   lives in AppBar (it renders inside the header bar, styled for the dark
   background) — this reads the same recordSearch state from the store.
   Single-record export (JSON/CSV for just the one household) lives in the
   card's "⋮" menu, same place as in the deployed app — the editor header's
   own export buttons were already retired there in favor of this, plus the
   Export tab for exporting everything at once. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { summarizeRecords, normalizeSearch, recordMatchesSearch, exportJson, exportCsv } from "../lib/storage";
import { recordProgress, formatUpdatedAt } from "../lib/recordProgress";
import { t } from "../lib/i18n";

export function RecordsScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const createRecord = useAppStore((s) => s.createRecord);
  const openRecord = useAppStore((s) => s.openRecord);
  const deleteRecordById = useAppStore((s) => s.deleteRecordById);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const recordSearch = useAppStore((s) => s.recordSearch);
  const setRecordSearch = useAppStore((s) => s.setRecordSearch);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const all = summarizeRecords(records);
  const needle = normalizeSearch(recordSearch);
  const list = all.filter((r) => recordMatchesSearch(r, needle));

  const handleDelete = (id: string) => {
    askConfirm(t("confirm_delete_record", lang), () => deleteRecordById(id));
  };

  if (all.length && !list.length) {
    return (
      <div className="panel">
        <h3>{t("records_heading", lang)}</h3>
        <p className="section-help">{t("records_help", lang)}</p>
        <div className="empty-state">
          {t("search_no_match", lang)}{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setRecordSearch(""); }}>
            {t("search_clear_link", lang)}
          </a>
        </div>
      </div>
    );
  }

  if (!all.length) {
    return (
      <div className="panel records-empty">
        <h2>{t("records_empty_title", lang)}</h2>
        <p className="section-help">{t("records_empty_body", lang)}</p>
        <div className="table-actions">
          <button type="button" className="btn btn-secondary" onClick={() => createRecord()}>
            + {t("btn_new_record", lang)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="stacked-actions">
        <button type="button" className="btn btn-secondary btn-new-cta" onClick={() => createRecord()}>
          + {t("btn_new_record", lang)}
        </button>
      </div>
      <p className="section-help">{t("records_help", lang)}</p>
      <p className="records-count">
        {needle
          ? `${list.length} ${t("search_showing", lang)} ${all.length} ${t("records_count_suffix", lang)}`
          : `${list.length} ${t("records_count_suffix", lang)}`}
      </p>
      <div className="records-list">
        {list.map((r) => {
          const p = recordProgress(records[r.id]);
          const menuOpen = openMenuId === r.id;
          return (
            <div
              key={r.id}
              className="record-card"
              role="button"
              tabIndex={0}
              onClick={() => openRecord(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openRecord(r.id);
                }
              }}
            >
              <div className="record-card-main">
                <div className="record-card-title">
                  {r.producerName || t("unnamed_household", lang)}
                  {r.language && r.language.toUpperCase() !== lang.toUpperCase() && (
                    <span className="lang-tag">{r.language.toUpperCase()}</span>
                  )}
                </div>
                <div className="record-card-sub">
                  {r.coopName || t("unnamed_coop", lang)}
                  {r.respondentName ? " · " + r.respondentName : ""}
                </div>
                <div className="record-card-date">
                  {t("col_updated", lang)}: {formatUpdatedAt(r.updatedAt)}
                </div>
                <div className="record-progress" title={`${p.done} / ${p.total}`}>
                  <span style={{ width: `${p.pct}%` }} className={p.done === p.total ? "is-complete" : ""} />
                </div>
                <div className="record-progress-label">
                  {p.done === p.total ? t("record_complete", lang) : `${p.done} ${t("record_of_steps", lang)} ${p.total}`}
                </div>
              </div>
              <button
                type="button"
                className="btn-icon card-menu-toggle"
                aria-label={t("btn_more_actions", lang)}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(menuOpen ? null : r.id);
                }}
              >
                &#8942;
              </button>
              {menuOpen && (
                <div className="card-menu" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn" onClick={() => openRecord(r.id)}>
                    {t("btn_open_record", lang)}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      exportJson(records[r.id]);
                      setOpenMenuId(null);
                    }}
                  >
                    {t("btn_export_json", lang)}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      exportCsv(records[r.id]);
                      setOpenMenuId(null);
                    }}
                  >
                    {t("btn_export_csv", lang)}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setOpenMenuId(null);
                      handleDelete(r.id);
                    }}
                  >
                    {t("btn_delete_record", lang)}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
