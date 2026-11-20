/* RecordsScreen.tsx
   Ported from renderRecordsScreen() in docs/js/app.js, then extended: one
   card per FARMER rather than one per record. A coach running two seasons
   for 100 households would otherwise see 200 near-identical cards — instead
   each farmer is one entry, with a row of season tags (newest first) to
   jump into a specific season directly. Not in the vanilla app, which has
   no season concept. "Compare seasons" lives only inside the editor
   (AppBar), not duplicated here, once a season is open.

   The search box itself lives in AppBar (it renders inside the header bar,
   styled for the dark background) — this reads the same recordSearch state
   from the store. Single-record export (JSON/CSV) lives in the card's "⋮"
   menu, same place as in the deployed app — the editor header's own export
   buttons were already retired there in favor of this, plus the Export tab
   for exporting everything at once. That menu acts on the card's
   represented (most recent) season; older seasons are reached via their tag. */

import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { summarizeRecords, normalizeSearch, recordMatchesSearch, exportJson, exportCsv, type RecordSummary } from "../lib/storage";
import { recordProgress, formatUpdatedAt } from "../lib/recordProgress";
import { t } from "../lib/i18n";
import { useMediaQuery } from "../lib/useMediaQuery";
import { WIDE_QUERY } from "../lib/layout";
import { ListHeader } from "./ListShell";

/** The "⋮" actions, shared by the phone cards and the tablet rows. */
function RecordMenu({ id, onClose, onStartNewSeason, onDelete }: {
  id: string; onClose: () => void; onStartNewSeason: (id: string) => void; onDelete: (id: string) => void;
}) {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const openRecord = useAppStore((s) => s.openRecord);
  return (
    <div className="card-menu" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="btn" onClick={() => openRecord(id)}>
        {t("btn_open_record", lang)}
      </button>
      <button type="button" className="btn" onClick={() => { onClose(); onStartNewSeason(id); }}>
        {t("btn_start_new_season", lang)}
      </button>
      <button type="button" className="btn" onClick={() => { exportJson(records[id]); onClose(); }}>
        {t("btn_export_json", lang)}
      </button>
      <button type="button" className="btn" onClick={() => { exportCsv(records[id]); onClose(); }}>
        {t("btn_export_csv", lang)}
      </button>
      <button type="button" className="btn btn-danger" onClick={() => { onClose(); onDelete(id); }}>
        {t("btn_delete_record", lang)}
      </button>
    </div>
  );
}

export function RecordsScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const createRecord = useAppStore((s) => s.createRecord);
  const openRecord = useAppStore((s) => s.openRecord);
  const startNewSeason = useAppStore((s) => s.startNewSeason);
  const deleteRecordById = useAppStore((s) => s.deleteRecordById);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const recordSearch = useAppStore((s) => s.recordSearch);
  const setRecordSearch = useAppStore((s) => s.setRecordSearch);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const wide = useMediaQuery(WIDE_QUERY);

  // summarizeRecords() sorts newest-updated-first overall, so grouping by
  // farmerId while walking that order keeps both each farmer's own seasons,
  // and the farmers themselves, newest first with no extra sort needed.
  const all = summarizeRecords(records);
  const farmerOrder: string[] = [];
  const farmerSeasons = new Map<string, RecordSummary[]>();
  all.forEach((r) => {
    if (!farmerSeasons.has(r.farmerId)) {
      farmerSeasons.set(r.farmerId, []);
      farmerOrder.push(r.farmerId);
    }
    farmerSeasons.get(r.farmerId)!.push(r);
  });

  const needle = normalizeSearch(recordSearch);
  // A farmer's whole group shows if ANY of their seasons match — searching
  // finds the household, not one specific season.
  const groups = farmerOrder
    .map((fid) => farmerSeasons.get(fid)!)
    .filter((seasons) => seasons.some((r) => recordMatchesSearch(r, needle)));

  const handleDelete = (id: string) => {
    askConfirm(t("confirm_delete_record", lang), () => deleteRecordById(id));
  };

  const handleStartNewSeason = (id: string) => {
    askConfirm(t("confirm_start_new_season", lang), () => startNewSeason(id), {
      confirmLabel: "btn_confirm_start_new_season",
      danger: false,
    });
  };

  // Tablet and laptop: one table row per farmer (design/shell-options HT0).
  if (wide) {
    return (
      <>
        <ListHeader
          title={t("nav_records", lang)}
          sub={`${farmerOrder.length} ${t("ls_households", lang)} · ${all.length} ${t("ls_seasons_on_device", lang)}`}
        >
          {all.length > 0 && (
            <label className="ls-search">
              <span className="visually-hidden">{t("search_label", lang)}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                autoComplete="off"
                placeholder={t("search_placeholder", lang)}
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
              />
            </label>
          )}
          <button type="button" className="ls-primary" onClick={() => createRecord()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("btn_new_record", lang)}
          </button>
        </ListHeader>
        <div className="ls-content">
          {!all.length ? (
            <div className="ls-empty">
              <h2>{t("records_empty_title", lang)}</h2>
              <p>{t("records_empty_body", lang)}</p>
            </div>
          ) : !groups.length ? (
            <div className="ls-empty">
              <p>
                {t("search_no_match", lang)}{" "}
                <button type="button" className="ls-link" onClick={() => setRecordSearch("")}>
                  {t("search_clear_link", lang)}
                </button>
              </p>
            </div>
          ) : (
            <div className="ls-table" role="table">
              <div className="ls-row ls-row-head" role="row">
                <span role="columnheader">{t("ls_col_farmer", lang)}</span>
                <span role="columnheader">{t("ls_col_code", lang)}</span>
                <span role="columnheader">{t("ls_col_place", lang)}</span>
                <span role="columnheader">{t("ls_col_seasons", lang)}</span>
                <span role="columnheader" className="ls-updated">{t("col_updated", lang)}</span>
                <span role="columnheader" />
              </div>
              {groups.map((seasons) => {
                const r = seasons[0];
                const menuOpen = openMenuId === r.id;
                return (
                  <div
                    key={r.id}
                    className="ls-row"
                    role="row"
                    tabIndex={0}
                    onClick={() => openRecord(r.id)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        openRecord(r.id);
                      }
                    }}
                  >
                    <span role="cell" className="ls-farmer">
                      {r.producerName || t("unnamed_household", lang)}
                      {r.language && r.language.toUpperCase() !== lang.toUpperCase() && (
                        <span className="lang-tag" title={`${t("record_lang_title", lang)} ${r.language.toUpperCase()}`}>{r.language.toUpperCase()}</span>
                      )}
                    </span>
                    <span role="cell" className="num">{r.producerCode || "—"}</span>
                    <span role="cell" className="ls-place" title={[r.village, r.coopName].filter(Boolean).join(" · ") || undefined}>
                      {[r.village, r.coopName].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <span role="cell" className="ls-tags">
                      {seasons.map((season, i) => {
                        const p = recordProgress(records[season.id]);
                        const complete = p.done === p.total;
                        const label = complete ? t("record_complete", lang) : `${p.done} ${t("record_of_steps", lang)} ${p.total}`;
                        return (
                          <button
                            key={season.id}
                            type="button"
                            className={`ls-tag${i === 0 && !complete ? " is-current" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openRecord(season.id);
                            }}
                          >
                            {(season.season || t("season_not_set", lang)) + " · " + label}
                          </button>
                        );
                      })}
                    </span>
                    {/* Laptop widths only (wide.css): when this farmer was last edited, any season. */}
                    <span role="cell" className="ls-updated">
                      {formatUpdatedAt(seasons.reduce((a, s) => (s.updatedAt > a ? s.updatedAt : a), ""))}
                    </span>
                    <span role="cell" className="ls-menu-cell">
                      <button
                        type="button"
                        className="ls-menu-btn"
                        aria-label={t("btn_more_actions", lang)}
                        aria-expanded={menuOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(menuOpen ? null : r.id);
                        }}
                      >
                        &#8942;
                      </button>
                      {menuOpen && <RecordMenu id={r.id} onClose={() => setOpenMenuId(null)} onStartNewSeason={handleStartNewSeason} onDelete={handleDelete} />}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  if (all.length && !groups.length) {
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

  // Phone (design/shell-options H0): one card per farmer with code, place
  // and a tag per season carrying its progress.
  return (
    <div className="ph-records">
      <button type="button" className="ph-new" onClick={() => createRecord()}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t("btn_new_record", lang)}
      </button>
      <p className="ph-count">
        {needle
          ? `${groups.length} ${t("search_showing", lang)} ${farmerOrder.length} ${t("ls_households", lang)}`
          : `${farmerOrder.length} ${t("ls_households", lang)} · ${all.length} ${t("ls_seasons_on_device", lang)}`}
      </p>
      {groups.map((seasons) => {
        const r = seasons[0]; // newest season represents the card
        const menuOpen = openMenuId === r.id;
        const place = [r.producerCode, r.village, r.coopName].filter(Boolean).join(" · ");
        return (
          <div
            key={r.id}
            className="ph-card"
            role="button"
            tabIndex={0}
            onClick={() => openRecord(r.id)}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                openRecord(r.id);
              }
            }}
          >
            <div className="ph-card-top">
              <div className="ph-card-titles">
                <span className="ph-card-name">
                  {r.producerName || t("unnamed_household", lang)}
                  {r.language && r.language.toUpperCase() !== lang.toUpperCase() && (
                    <span className="lang-tag" title={`${t("record_lang_title", lang)} ${r.language.toUpperCase()}`}>{r.language.toUpperCase()}</span>
                  )}
                </span>
                <span className="ph-card-sub">{place || t("unnamed_coop", lang)}</span>
              </div>
              <button
                type="button"
                className="ls-menu-btn"
                aria-label={t("btn_more_actions", lang)}
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(menuOpen ? null : r.id);
                }}
              >
                &#8942;
              </button>
            </div>
            <div className="ls-tags">
              {seasons.map((season, i) => {
                const p = recordProgress(records[season.id]);
                const complete = p.done === p.total;
                const label = complete ? t("record_complete", lang) : `${p.done} ${t("record_of_steps", lang)} ${p.total}`;
                return (
                  <button
                    key={season.id}
                    type="button"
                    className={`ls-tag${i === 0 && !complete ? " is-current" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openRecord(season.id);
                    }}
                  >
                    {(season.season || t("season_not_set", lang)) + " · " + label}
                  </button>
                );
              })}
            </div>
            {menuOpen && <RecordMenu id={r.id} onClose={() => setOpenMenuId(null)} onStartNewSeason={handleStartNewSeason} onDelete={handleDelete} />}
          </div>
        );
      })}
    </div>
  );
}
