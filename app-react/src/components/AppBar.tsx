/* AppBar.tsx
   Ported from buildAppBar() + renderBarContext() in docs/js/app.js. The bar
   says where you are rather than carrying a fixed title: on the list screen
   that's the record count, inside a record it's who you're interviewing and
   which step you're on. Language switching lives on the Settings screen, not
   here — the vanilla app moved it there too (buildAppBar stashes the old
   header lang-switch into a hidden container), it isn't an omission. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { TABS, TAB_LABEL_KEY } from "../lib/tabs";

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

  const isEditor = screen === "editor" && !!record;
  // So a coach editing this season can jump straight to the farmer's other
  // seasons without first going back to the records list.
  const seasonsCount = record
    ? Object.values(records).filter((r) => r.meta.farmerId === record.meta.farmerId).length
    : 0;

  let context: string;
  let sub: string;
  if (isEditor && record) {
    context = record.profile.producerName || t("unnamed_household", currentLang);
    const idx = TABS.indexOf(currentTab as (typeof TABS)[number]) + 1;
    const bits = [record.profile.coopName, record.profile.village].filter(Boolean);
    const units = [record.meta.currencyUnit, record.meta.areaUnit].filter(Boolean).join(" / ");
    if (units) bits.push(units);
    sub = `${idx} ${t("record_of_steps", currentLang)} ${TABS.length} · ${t(TAB_LABEL_KEY[currentTab], currentLang)}`
      + (bits.length ? " · " + bits.join(" · ") : "");
  } else {
    context = t("records_heading", currentLang);
    sub = `${Object.keys(records).length} ${t("records_count_suffix", currentLang)}`;
  }

  return (
    <header className="app-header">
      <div className="bar-row">
        {isEditor && (
          <button type="button" className="btn-icon bar-back" aria-label={t("btn_my_records", currentLang)} onClick={goToList}>
            &#8592;
          </button>
        )}
        <div className="bar-titles">
          <span className="bar-product">{t("app_title", currentLang)}</span>
          <span className="bar-context">{context}</span>
          <span className="bar-sub">{sub}</span>
        </div>
        {isEditor && seasonsCount > 1 && record && (
          <button type="button" className="save-status" onClick={() => openFarmerHistory(record.meta.farmerId)}>
            {t("farmer_history_view_cta", currentLang)} ({seasonsCount})
          </button>
        )}
        {isEditor && (
          <span className={`save-status ${saveStatus === "saving" ? "saving" : ""}`}>
            {t(saveStatus === "saving" ? "btn_saving" : "btn_save", currentLang)}
          </span>
        )}
      </div>

      {screen === "list" && listTab === "records" && Object.keys(records).length > 0 && (
        <div className="search-bar">
          <div className="search-field">
            <label htmlFor="record-search">{t("search_label", currentLang)}</label>
            <input
              id="record-search"
              type="search"
              className="field"
              autoComplete="off"
              placeholder={t("search_placeholder", currentLang)}
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
            />
          </div>
          {recordSearch && (
            <button type="button" className="btn" onClick={() => setRecordSearch("")}>
              {t("search_clear", currentLang)}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
