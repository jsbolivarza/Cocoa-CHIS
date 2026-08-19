/* SettingsScreen.tsx — ported from renderSettingsScreen() in docs/js/app.js.
   Language switching lives here, not in the top bar — matches the current
   deployed app, which moved it off the header. */

import { useRef, useState } from "react";
import { useAppStore } from "../store/appStore";
import { parseImportFile } from "../lib/storage";
import { t, type Lang } from "../lib/i18n";

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

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = await parseImportFile(file);
    } catch {
      alert("Could not read this file.");
      return;
    }
    const ids = await importRecords(parsed);
    if (ids.length === 1) openRecord(ids[0]);
    else goToList();
  };

  return (
    <div className="panel">
      <h3>{t("settings_heading", lang)}</h3>
      <p className="section-help">{t("settings_help", lang)}</p>

      <h4>{t("settings_language", lang)}</h4>
      <div className="lang-switch">
        {(["en", "fr", "es"] as Lang[]).map((code) => (
          <button
            key={code}
            type="button"
            className={`lang-btn ${code === lang ? "active" : ""}`}
            onClick={() => setLang(code)}
          >
            {code.toUpperCase()}
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
        <button type="button" className="btn btn-danger" onClick={handleDeleteAll}>
          {t("btn_delete_all", lang)}
        </button>
      </div>
      <p className="field-hint">{t("settings_delete_note", lang)}</p>

      <h4>{t("settings_about", lang)}</h4>
      <p className="field-hint">
        {t("settings_version", lang)} {__APP_VERSION__}
      </p>
      <div className="stacked-actions">
        <button type="button" className="btn btn-secondary" onClick={handleCheckUpdate}>
          {updateLabel ?? t("btn_check_update", lang)}
        </button>
      </div>
    </div>
  );
}
