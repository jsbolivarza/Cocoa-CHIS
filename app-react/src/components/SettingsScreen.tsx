/* SettingsScreen.tsx — ported from renderSettingsScreen() in docs/js/app.js.
   Language switching lives here, not in the top bar — matches the current
   deployed app, which moved it off the header. */

import { useRef, useState } from "react";
import { useAppStore } from "../store/appStore";
import { parseImportFile, readTextFile } from "../lib/storage";
import { parseRosterCsv } from "../lib/roster";
import { StorageDiagnostics } from "./StorageDiagnostics";
import { SyncPanel } from "./SyncPanel";
import { t, type Lang } from "../lib/i18n";

/** Each language named in itself, never translated. */
const LANGUAGE_NAMES: Record<Lang, string> = { en: "English", fr: "Français", es: "Español" };

export function SettingsScreen() {
  const lang = useAppStore((s) => s.currentLang);
  const setLang = useAppStore((s) => s.setLang);
  const records = useAppStore((s) => s.records);
  const clearAll = useAppStore((s) => s.clearAll);
  const importRecords = useAppStore((s) => s.importRecords);
  const openRecord = useAppStore((s) => s.openRecord);
  const goToList = useAppStore((s) => s.goToList);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updateLabel, setUpdateLabel] = useState<string | null>(null);
  const roster = useAppStore((s) => s.roster);
  const setRoster = useAppStore((s) => s.setRoster);
  const clearRoster = useAppStore((s) => s.clearRoster);
  const rosterInputRef = useRef<HTMLInputElement>(null);
  const [rosterMsg, setRosterMsg] = useState<string | null>(null);

  // Ported from checkForUpdateNow() in docs/js/app.js: lets a coach confirm
  // they're on the version they were told to be on, without a hard reload.
  const handleCheckUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;
    setUpdateLabel(t("update_checking", lang));
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
      setUpdateLabel(reg?.waiting ? t("update_available", lang) : t("update_none", lang));
    } catch {
      setUpdateLabel(t("update_none", lang));
    }
  };

  const handleDeleteAll = () => {
    if (!Object.keys(records).length) return;
    askConfirm(t("confirm_delete_all", lang), () => clearAll());
  };

  const handleRosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let text: string;
    try {
      text = await readTextFile(file);
    } catch {
      setRosterMsg(t("roster_err_empty", lang));
      return;
    }
    const result = parseRosterCsv(text);
    if (result.error) {
      setRosterMsg(t(result.error === "no_code_column" ? "roster_err_no_code" : "roster_err_empty", lang));
      return;
    }
    await setRoster(result.entries);
    setRosterMsg(
      `${t("roster_imported", lang)} ${result.entries.length}` +
        (result.skipped ? ` · ${result.skipped} ${t("roster_skipped", lang)}` : "")
    );
  };

  const handleClearRoster = () => {
    askConfirm(t("confirm_clear_roster", lang), () => {
      clearRoster();
      setRosterMsg(null);
    }, { confirmLabel: "btn_clear_roster" });
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = await parseImportFile(file);
    } catch {
      alert(t("import_read_error", lang));
      return;
    }
    const r = await importRecords(parsed);
    if (r.stored.length === 1 && r.unchanged + r.keptLocal === 0) {
      openRecord(r.stored[0].meta.id);
      return;
    }
    // Several records, or some skipped: say what happened, so importing the
    // same file twice visibly adds nothing instead of silently doing nothing.
    const parts = [
      `${t("sync_dl_added", lang)} ${r.added}`,
      `${t("sync_dl_updated", lang)} ${r.updated}`,
      `${t("sync_dl_unchanged", lang)} ${r.unchanged}`,
    ];
    if (r.keptLocal) parts.push(`${t("sync_dl_kept_local", lang)} ${r.keptLocal}`);
    alert(parts.join("\n"));
    goToList();
  };

  return (
    <div className="panel">
      <h3>{t("settings_heading", lang)}</h3>
      <p className="section-help">{t("settings_help", lang)}</p>

      <h4>{t("settings_language", lang)}</h4>
      {/* Three equal segments with each language's own name (a coach who
          landed in the wrong language still recognises theirs), instead
          of EN / FR / ES squeezed to the left of a full-width bar. */}
      <div className="lang-switch lang-switch-settings" role="group" aria-label={t("settings_language", lang)}>
        {(["en", "fr", "es"] as Lang[]).map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={code === lang}
            className={`lang-btn ${code === lang ? "active" : ""}`}
            onClick={() => setLang(code)}
          >
            {LANGUAGE_NAMES[code]}
          </button>
        ))}
      </div>

      <h4>{t("settings_data", lang)}</h4>
      <div className="stacked-actions">
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
          {t("btn_import_json", lang)}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleImportChange}
        />
      </div>

      <h4>{t("roster_heading", lang)}</h4>
      <p className="section-help">{t("roster_help", lang)}</p>
      <p className="field-hint">
        {roster.length ? `${t("roster_count", lang)} ${roster.length}` : t("roster_none", lang)}
      </p>
      {rosterMsg && <p className="field-hint" role="status">{rosterMsg}</p>}
      <div className="stacked-actions">
        <button type="button" className="btn" onClick={() => rosterInputRef.current?.click()}>
          {t("btn_import_roster", lang)}
        </button>
        <input
          ref={rosterInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          style={{ display: "none" }}
          onChange={handleRosterChange}
        />
        {roster.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={handleClearRoster}>
            {t("btn_clear_roster", lang)}
          </button>
        )}
      </div>

      <SyncPanel />

      <StorageDiagnostics />

      <h4>{t("settings_about", lang)}</h4>
      <p className="field-hint">
        {t("settings_version", lang)} {__APP_VERSION__} · {t("settings_built", lang)} {__APP_BUILT__}
      </p>
      <div className="stacked-actions">
        <button type="button" className="btn btn-secondary" onClick={handleCheckUpdate}>
          {updateLabel ?? t("btn_check_update", lang)}
        </button>
      </div>

      {/* Kept apart at the end of the page, outlined rather than filled, so
          it can't be mis-tapped for Import JSON on a tablet outdoors. The
          confirm dialog stays as the second guard. */}
      <section className="danger-zone">
        <h4>{t("settings_danger_heading", lang)}</h4>
        <p className="field-hint">{t("settings_delete_note", lang)}</p>
        <button type="button" className="btn btn-danger-outline" onClick={handleDeleteAll}>
          {t("btn_delete_all", lang)}
        </button>
      </section>
    </div>
  );
}
