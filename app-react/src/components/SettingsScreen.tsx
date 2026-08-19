/* SettingsScreen.tsx — ported from renderSettingsScreen() in docs/js/app.js.
   Language switching lives here, not in the top bar — matches the current
   deployed app, which moved it off the header. Import-JSON and the update
   checker are not ported yet. */

import { useAppStore } from "../store/appStore";
import { t, type Lang } from "../lib/i18n";

export function SettingsScreen() {
  const lang = useAppStore((s) => s.currentLang);
  const setLang = useAppStore((s) => s.setLang);
  const records = useAppStore((s) => s.records);
  const clearAll = useAppStore((s) => s.clearAll);
  const askConfirm = useAppStore((s) => s.askConfirm);

  const handleDeleteAll = () => {
    if (!Object.keys(records).length) return;
    askConfirm(t("confirm_delete_all", lang), () => clearAll());
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
        <button type="button" className="btn btn-danger" onClick={handleDeleteAll}>
          {t("btn_delete_all", lang)}
        </button>
      </div>
      <p className="field-hint">{t("settings_delete_note", lang)}</p>
    </div>
  );
}
