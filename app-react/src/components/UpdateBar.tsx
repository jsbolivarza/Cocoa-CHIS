/* UpdateBar.tsx
   Ported from showUpdateBar() + setupUpdates() in docs/js/app.js. A new
   service worker never takes over on its own — swapping code out from
   under a half-finished interview risks the record on screen, so the
   coach is asked and the reload happens only when they accept.
   useRegisterSW's needRefresh is vite-plugin-pwa's equivalent of vanilla's
   "reg.waiting" check.

   Browsers only look for a new service worker on navigation, and a phone
   kept in a pocket as an installed app may not navigate for days — so
   setupUpdates() also checked whenever the app returned to the foreground,
   and once an hour regardless. The plain useRegisterSW() call alone does
   not do this (relying on it is why a freshly deployed fix may not appear
   until the tab is closed and reopened); onRegisteredSW re-adds that
   reinforcement against the actual registration. */

import { useRegisterSW } from "virtual:pwa-register/react";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function UpdateBar() {
  const lang = useAppStore((s) => s.currentLang);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", check);
      setInterval(check, CHECK_INTERVAL_MS);
    },
  });

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
