/* UpdateBar.tsx
   Ported from showUpdateBar() in docs/js/app.js. A new service worker never
   takes over on its own — swapping code out from under a half-finished
   interview risks the record on screen, so the coach is asked and the
   reload happens only when they accept. useRegisterSW's needRefresh is
   vite-plugin-pwa's equivalent of vanilla's "reg.waiting" check. */

import { useRegisterSW } from "virtual:pwa-register/react";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";

export function UpdateBar() {
  const lang = useAppStore((s) => s.currentLang);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-bar">
      <span>{t("update_available", lang)}</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>
        {t("update_reload", lang)}
      </button>
      <button type="button" className="update-later" aria-label={t("update_later", lang)} onClick={() => setNeedRefresh(false)}>
        &#10005;
      </button>
    </div>
  );
}
