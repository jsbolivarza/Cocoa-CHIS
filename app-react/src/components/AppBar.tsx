/* AppBar.tsx
   Phone header (wide screens use ListShell / HouseholdRail instead).
   Ported from buildAppBar() + renderBarContext() in docs/js/app.js, then
   redesigned after design/shell-options H0: the brand row (Fairtrade logo,
   app icon, "Cocoa Capture") sits on top of every screen so a coach always
   knows which app this is; below it, the list screens get a large title,
   the device-save status and (on Records) the search box. Inside a record
   the bar names the household and the step. Language switching lives on
   the Settings screen, as in the vanilla app. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { TAB_LABEL_KEY, LIST_TAB_SHORT_KEY } from "../lib/tabs";
import { recordProgress } from "../lib/recordProgress";
import { useOnline } from "../lib/useOnline";
import { Brand } from "./Brand";

export function AppBar() {
  const screen = useAppStore((s) => s.screen);
  const record = useAppStore((s) => s.record);
  const records = useAppStore((s) => s.records);
  const currentTab = useAppStore((s) => s.currentTab);
  const currentLang = useAppStore((s) => s.currentLang);
  const saveStatus = useAppStore((s) => s.saveStatus);
  const goToList = useAppStore((s) => s.goToList);
  const listTab = useAppStore((s) => s.listTab);
  const recordSearch = useAppStore((s) => s.recordSearch);
  const setRecordSearch = useAppStore((s) => s.setRecordSearch);
  const openFarmerHistory = useAppStore((s) => s.openFarmerHistory);
  const online = useOnline();

  const isEditor = screen === "editor" && !!record;

  if (!isEditor) {
    const title =
      screen === "history" ? t("farmer_history_heading", currentLang) : t(LIST_TAB_SHORT_KEY[listTab], currentLang);
    return (
      <header className="app-header ph-head">
        <Brand tone="dark" />
        <div className="ph-title-row">
          <h1>{title}</h1>
          <span className="ph-status">
            <span className="ph-status-dot" aria-hidden="true" />
            {t(online ? "ls_online_saved" : "ls_offline_saved", currentLang)}
          </span>
        </div>
        {screen === "list" && listTab === "records" && Object.keys(records).length > 0 && (
          <label className="ph-search">
            <span className="visually-hidden">{t("search_label", currentLang)}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="record-search"
              type="search"
              autoComplete="off"
              placeholder={t("search_placeholder", currentLang)}
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
            />
          </label>
        )}
      </header>
    );
  }

  const seasonsCount = Object.values(records).filter((r) => r.meta.farmerId === record.meta.farmerId).length;
  const context = record.profile.producerName || t("unnamed_household", currentLang);
  // Same count as the hub and the Records tags (recordProgress), not the
  // step's position, which read as "1 of 7" beside a hub saying "0 of 6".
  const progress = recordProgress(record);
  const bits = [record.profile.coopName, record.profile.village].filter(Boolean);
  const units = [record.meta.currencyUnit, record.meta.areaUnit].filter(Boolean).join(" / ");
  if (units) bits.push(units);
  const sub =
    `${t(TAB_LABEL_KEY[currentTab], currentLang)} · ${progress.done} ${t("record_of_steps", currentLang)} ${progress.total} ${t("hub_steps_complete", currentLang)}` +
    (bits.length ? " · " + bits.join(" · ") : "");

  return (
    <header className="app-header">
      <Brand tone="dark" compact />
      <div className="bar-row">
        <button type="button" className="btn-icon bar-back" aria-label={t("btn_my_records", currentLang)} onClick={goToList}>
          &#8592;
        </button>
        <div className="bar-titles">
          <span className="bar-context">{context}</span>
          <span className="bar-sub">{sub}</span>
        </div>
        {seasonsCount > 1 && (
          <button type="button" className="bar-chip" onClick={() => openFarmerHistory(record.meta.farmerId)}>
            {t("farmer_history_view_cta", currentLang)} ({seasonsCount})
          </button>
        )}
        <span className={`save-status ${saveStatus === "saving" ? "saving" : ""}`}>
          {t(saveStatus === "saving" ? "btn_saving" : "btn_save", currentLang)}
        </span>
      </div>
    </header>
  );
}
