/* ExportScreen.tsx — ported from renderExportScreen() in docs/js/app.js. */

import { useAppStore } from "../store/appStore";
import { exportAllCsv, exportAllJson } from "../lib/storage";
import { t } from "../lib/i18n";

export function ExportScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const n = Object.keys(records).length;

  return (
    <div className="panel">
      <h3>{t("export_heading", lang)}</h3>
      <p className="section-help">{t("export_help", lang)}</p>
      <p className="records-count">
        {n} {t("records_count_suffix", lang)}
      </p>
      <div className="stacked-actions">
        <button type="button" className="btn btn-secondary" disabled={!n} onClick={() => exportAllCsv(records)}>
          {t("btn_export_all_csv", lang)}
        </button>
        <button type="button" className="btn" disabled={!n} onClick={() => exportAllJson(records)}>
          {t("btn_export_all_json", lang)}
        </button>
      </div>
      <p className="field-hint">{t("export_note", lang)}</p>
    </div>
  );
}
