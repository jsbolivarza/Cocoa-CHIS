/* ConfirmModal.tsx
   Ported from showConfirmModal() in docs/js/app.js. window.confirm() is
   unreliable in WKWebView-based iOS browsers (Edge, Chrome, Firefox all run
   on it, not their real engines) especially for a page opened from a local
   file or PWA context — the dialog can silently never appear. This renders
   the same confirmation as plain markup instead, so it behaves the same on
   every device. One instance is mounted once in App.tsx and driven by
   confirmRequest in the store, rather than one per caller. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";

export function ConfirmModal() {
  const confirmRequest = useAppStore((s) => s.confirmRequest);
  const closeConfirm = useAppStore((s) => s.closeConfirm);
  const lang = useAppStore((s) => s.currentLang);

  if (!confirmRequest) return null;

  const onOk = () => {
    const { onConfirm } = confirmRequest;
    closeConfirm();
    onConfirm();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeConfirm()}>
      <div className="modal-box">
        <p>{confirmRequest.message}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={closeConfirm}>
            {t("btn_cancel", lang)}
          </button>
          <button type="button" className="btn btn-danger" onClick={onOk}>
            {t("btn_delete_record", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
