/* SyncPanel.tsx — "Upload to server" block on Settings (see lib/sync.ts).
   Upload is a deliberate tap, not automatic: coaches often capture with no
   signal and upload later from the coop office. */

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import {
  SyncError, downloadRecords, signIn, signOut, signedInEmail, syncConfigured, syncStatus, uploadRecords,
  type SyncStatus,
} from "../lib/sync";

export function SyncPanel() {
  const lang = useAppStore((s) => s.currentLang);
  const records = useAppStore((s) => s.records);
  const mergeDownloaded = useAppStore((s) => s.mergeDownloaded);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return Promise.all([signedInEmail(), syncStatus(records)]).then(([e, s]) => {
      setEmail(e);
      setStatus(s);
    });
  }, [records]);

  useEffect(() => {
    if (syncConfigured()) refresh();
  }, [refresh]);

  if (!syncConfigured()) {
    return (
      <>
        <h4>{t("sync_heading", lang)}</h4>
        <p className="field-hint">{t("sync_not_configured", lang)}</p>
      </>
    );
  }

  const errorText = (e: unknown) => t(e instanceof SyncError ? `sync_err_${e.code}` : "sync_err_server", lang);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await signIn(formEmail.trim(), password);
      setPassword("");
      await refresh();
    } catch (err) {
      setMsg(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!status?.pending.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const n = await uploadRecords(status.pending);
      setMsg(`${t("sync_done", lang)} ${n}`);
    } catch (err) {
      setMsg(errorText(err));
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await mergeDownloaded(await downloadRecords());
      const parts = [
        `${t("sync_dl_added", lang)} ${r.added}`,
        `${t("sync_dl_updated", lang)} ${r.updated}`,
        `${t("sync_dl_unchanged", lang)} ${r.unchanged}`,
      ];
      if (r.keptLocal) parts.push(`${t("sync_dl_kept_local", lang)} ${r.keptLocal}`);
      setMsg(parts.join(" · "));
    } catch (err) {
      setMsg(errorText(err));
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMsg(null);
    await refresh();
  };

  return (
    <>
      <h4>{t("sync_heading", lang)}</h4>
      <p className="section-help">{t("sync_help", lang)}</p>
      {!email ? (
        <form className="sync-form" onSubmit={handleSignIn}>
          <label>
            {t("sync_email", lang)}
            <input className="field" type="email" autoComplete="username" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
          </label>
          <label>
            {t("sync_password", lang)}
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="btn" disabled={busy}>
            {t("sync_sign_in", lang)}
          </button>
        </form>
      ) : (
        <>
          <p className="field-hint">
            {t("sync_signed_in_as", lang)} <strong>{email}</strong>
          </p>
          {status && (
            <dl className="diag-list">
              <div className="diag-row">
                <dt>{t("sync_pending", lang)}</dt>
                <dd>{status.pending.length}</dd>
              </div>
              <div className="diag-row">
                <dt>{t("sync_uploaded", lang)}</dt>
                <dd>{status.uploaded}</dd>
              </div>
              <div className="diag-row">
                <dt>{t("sync_no_consent", lang)}</dt>
                <dd>{status.noConsent}</dd>
              </div>
              <div className="diag-row">
                <dt>{t("sync_last", lang)}</dt>
                <dd>{status.lastUploadAt ? new Date(status.lastUploadAt).toLocaleString() : "—"}</dd>
              </div>
            </dl>
          )}
          <p className="field-hint">{t("sync_download_help", lang)}</p>
          <div className="stacked-actions">
            <button type="button" className="btn" onClick={handleUpload} disabled={busy || !status?.pending.length}>
              {busy ? t("sync_uploading", lang) : t("sync_upload", lang)}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleDownload} disabled={busy}>
              {t("sync_download", lang)}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleSignOut} disabled={busy}>
              {t("sync_sign_out", lang)}
            </button>
          </div>
        </>
      )}
      {msg && <p className="field-hint" role="status">{msg}</p>}
    </>
  );
}
