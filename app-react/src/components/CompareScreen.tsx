/* CompareScreen.tsx
   Stub of renderCompareScreen() from docs/js/app.js. The full side-by-side
   comparison table, filters and chart are the last piece of the migration
   plan (they read every calculated field across every tab, so they're most
   useful once the other tabs exist). For now this reproduces just the
   "not enough data yet" guard, which is accurate regardless of how many
   tabs are built. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";

export function CompareScreen() {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const count = Object.keys(records).length;

  return (
    <div className="panel">
      <h3>{t("compare_heading", lang)}</h3>
      <p className="section-help">{t("compare_help", lang)}</p>
      {count < 2 ? (
        <div className="empty-state">{t("compare_need_more", lang)}</div>
      ) : (
        <div className="empty-state">Full comparison table not built yet — coming with the Results tab.</div>
      )}
    </div>
  );
}
