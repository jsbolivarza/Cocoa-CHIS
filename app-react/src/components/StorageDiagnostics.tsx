/* StorageDiagnostics.tsx — read-only device storage check, shown on the
   Settings screen.

   Field devices are phones and tablets that will never be cabled to a laptop
   with DevTools open, so "is this device actually saving the data?" has to be
   answerable from inside the app — something a coach can read out over the
   phone. Nothing here writes a record; the only action is asking the browser
   for eviction protection. */

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import {
  formatBytes,
  getStorageDiagnostics,
  requestPersistentStorage,
  type StorageDiagnostics as Diagnostics,
} from "../lib/storage";
import { t } from "../lib/i18n";

const SW_LABEL = {
  active: "storage_sw_active",
  waiting: "storage_sw_waiting",
  none: "storage_sw_none",
  unsupported: "storage_sw_unsupported",
} as const;

export function StorageDiagnostics() {
  const lang = useAppStore((s) => s.currentLang);
  const records = useAppStore((s) => s.records);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [protectResult, setProtectResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getStorageDiagnostics()
      .then(setDiag)
      .catch(() => setDiag(null));
  }, []);

  // Re-read whenever the record count changes, so capturing or deleting a
  // household shows up here without the coach having to tap Refresh.
  useEffect(refresh, [refresh, records]);

  const handleProtect = async () => {
    const granted = await requestPersistentStorage();
    setProtectResult(t(granted ? "storage_protect_ok" : "storage_protect_no", lang));
    refresh();
  };

  // persisted is deliberately tri-state: Safari implements only part of the
  // Storage API, and "we couldn't ask" must not read as "no".
  const triBool = (v: boolean | null) =>
    v == null ? t("val_unknown", lang) : t(v ? "val_yes" : "val_no", lang);

  if (!diag) return null;

  return (
    <>
      <h4>{t("settings_storage", lang)}</h4>
      <p className="section-help">{t("storage_help", lang)}</p>

      <dl className="diag-list">
        <DiagRow label={t("storage_records", lang)} value={String(diag.recordCount)} />
        <DiagRow
          label={t("storage_used", lang)}
          value={
            diag.quotaBytes != null
              ? `${formatBytes(diag.usageBytes)} / ${formatBytes(diag.quotaBytes)}`
              : formatBytes(diag.usageBytes)
          }
        />
        <DiagRow label={t("storage_offline", lang)} value={t(SW_LABEL[diag.serviceWorker], lang)} />
        <DiagRow
          label={t("storage_installed", lang)}
          value={t(diag.installed ? "val_yes" : "val_no", lang)}
        />
        <DiagRow label={t("storage_persisted", lang)} value={triBool(diag.persisted)} />
        <DiagRow label={t("storage_db_version", lang)} value={String(diag.dbVersion)} />
      </dl>

      {!diag.installed && <p className="warn-note">{t("storage_install_warning", lang)}</p>}

      <div className="stacked-actions">
        <button type="button" className="btn btn-secondary" onClick={refresh}>
          {t("btn_storage_refresh", lang)}
        </button>
        {diag.persisted !== true && (
          <button type="button" className="btn btn-secondary" onClick={handleProtect}>
            {protectResult ?? t("btn_storage_protect", lang)}
          </button>
        )}
      </div>
    </>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="diag-row">
      <dt className="diag-label">{label}</dt>
      <dd className="diag-value">{value}</dd>
    </div>
  );
}
