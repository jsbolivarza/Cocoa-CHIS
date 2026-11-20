import { useEffect } from "react";
import { useAppStore } from "./store/appStore";
import { t } from "./lib/i18n";
import { TABS, TAB_LABEL_KEY, LIST_TABS, LIST_TAB_LABEL_KEY } from "./lib/tabs";
import { stepState } from "./lib/recordProgress";
import { AppBar } from "./components/AppBar";
import { ConfirmModal } from "./components/ConfirmModal";
import { ConsentTab } from "./components/ConsentTab";
import { ExpendituresTab } from "./components/ExpendituresTab";
import { ProfileTab } from "./components/ProfileTab";
import { CostsTab } from "./components/CostsTab";
import { RevenuesTab } from "./components/RevenuesTab";
import { LabourTab } from "./components/LabourTab";
import { ResultsTab } from "./components/ResultsTab";
import { StepIcon } from "./components/StepIcon";
import { StepFooter } from "./components/StepFooter";
import { BottomNav } from "./components/BottomNav";
import { RecordsScreen } from "./components/RecordsScreen";
import { FarmerHistoryScreen } from "./components/FarmerHistoryScreen";
import { CompareScreen } from "./components/CompareScreen";
import { ExportScreen } from "./components/ExportScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { UpdateBar } from "./components/UpdateBar";
import { HouseholdRail } from "./components/HouseholdRail";
import { HubScreen } from "./components/HubScreen";
import { ListShell, ListHeader } from "./components/ListShell";
import { useMediaQuery } from "./lib/useMediaQuery";
import { WIDE_QUERY, ROOMY_QUERY, NARROW_WIDE_QUERY } from "./lib/layout";
import { startScrollCue } from "./lib/scrollCue";

// Steps whose tables need the width: on a tablet the rail collapses to an
// icon strip while they are open (design/shell-options HT3 to HT6).
const WIDE_TABLE_TABS = ["profile", "revenues", "costs", "labour"];
import "./style.css";
import "./wide.css";
import "./theme-quiet.css";
import "./theme-grouped.css";
import "./font-exo.css";
import "./motion.css";

// Look (JB 20.11.26): the grouped scheme with Exo only is the default.
// It is layered as body classes over the original stylesheets:
// theme-quiet.css (neutral colours) + theme-grouped.css (grey page, white
// groups, pill controls, floating tab bar) + font-exo.css (headings in Exo).
// ?theme=classic in the URL shows the original look, for comparison only;
// it is read once and navigation never changes the URL.
if (new URLSearchParams(window.location.search).get("theme") !== "classic") {
  document.body.classList.add("theme-quiet", "theme-grouped", "font-exo");
}

export default function App() {
  const loaded = useAppStore((s) => s.loaded);
  const init = useAppStore((s) => s.init);
  const screen = useAppStore((s) => s.screen);
  const currentLang = useAppStore((s) => s.currentLang);
  const currentTab = useAppStore((s) => s.currentTab);
  const switchTab = useAppStore((s) => s.switchTab);
  const listTab = useAppStore((s) => s.listTab);
  const switchListTab = useAppStore((s) => s.switchListTab);
  const record = useAppStore((s) => s.record);
  const wide = useMediaQuery(WIDE_QUERY);
  const roomy = useMediaQuery(ROOMY_QUERY);
  const narrowWide = useMediaQuery(NARROW_WIDE_QUERY);

  // The hub only exists in the wide layout; a tablet turned or resized
  // down to phone width falls back to the first step instead of a blank page.
  useEffect(() => {
    if (!wide && screen === "editor" && currentTab === "hub") switchTab("consent");
  }, [wide, screen, currentTab, switchTab]);

  useEffect(() => {
    init();
  }, [init]);

  // Fade the edge of any table that has hidden columns (lib/scrollCue.ts).
  useEffect(() => startScrollCue(), []);

  // Ported from the body.classList.toggle("screen-list"/"screen-editor")
  // calls in docs/js/app.js. CSS uses these (.screen-list .editor-only,
  // body.screen-list's phone bottom-nav padding) to scope shell chrome to
  // one screen without every element needing its own conditional.
  useEffect(() => {
    document.body.classList.toggle("screen-list", screen === "list");
    document.body.classList.toggle("screen-editor", screen === "editor");
    document.body.classList.toggle("layout-wide", wide);
  }, [screen, wide]);

  if (!loaded) return <div className="panel">…</div>;

  const tabContent = (
    <>
      {currentTab === "consent" && <ConsentTab />}
      {currentTab === "profile" && <ProfileTab />}
      {currentTab === "revenues" && <RevenuesTab />}
      {currentTab === "costs" && <CostsTab />}
      {currentTab === "labour" && <LabourTab />}
      {currentTab === "expenditures" && <ExpendituresTab />}
      {currentTab === "results" && <ResultsTab />}
    </>
  );
  const wideEditor = wide && screen === "editor" && !!record;
  // Page title for the wide list shell; each screen's own first heading is
  // hidden there (wide.css) so the title doesn't appear twice.
  const wideListTitleKey =
    screen === "history" ? "farmer_history_heading" : { records: "nav_records", compare: "compare_heading", export: "export_heading", settings: "settings_heading" }[listTab];

  return (
    <>
      {!wide && <AppBar />}

      {wide && (screen === "list" || screen === "history") && (
        <ListShell>
          {screen === "list" && listTab === "records" ? (
            <RecordsScreen />
          ) : (
            <>
              <ListHeader title={t(wideListTitleKey, currentLang)} />
              <div className="ls-content">
                {screen === "history" && <FarmerHistoryScreen />}
                {screen === "list" && listTab === "compare" && <CompareScreen />}
                {screen === "list" && listTab === "export" && <ExportScreen />}
                {screen === "list" && listTab === "settings" && <SettingsScreen />}
              </div>
            </>
          )}
        </ListShell>
      )}

      {!wide && screen === "list" && (
        <>
          <nav id="list-nav">
            {LIST_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`nav-btn ${tab === listTab ? "active" : ""}`}
                onClick={() => switchListTab(tab)}
              >
                {t(LIST_TAB_LABEL_KEY[tab], currentLang)}
              </button>
            ))}
          </nav>
          <main>
            {listTab === "records" && <RecordsScreen />}
            {listTab === "compare" && <CompareScreen />}
            {listTab === "export" && <ExportScreen />}
            {listTab === "settings" && <SettingsScreen />}
          </main>
          <BottomNav />
        </>
      )}

      {wideEditor && record && (
        <div className="hh-shell">
          <HouseholdRail
            compact={
              (narrowWide && currentTab !== "hub") || (!roomy && WIDE_TABLE_TABS.includes(currentTab))
            }
          />
          <div className="hh-main">
            {currentTab === "hub" ? (
              <HubScreen />
            ) : (
              <>
                <header className="page-head">
                  <div className="page-head-titles">
                    <h1>{t(TAB_LABEL_KEY[currentTab], currentLang)}</h1>
                    <span className="page-head-sub">
                      {[record.profile.producerName || t("unnamed_household", currentLang), record.meta.season, record.profile.coopName]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <button type="button" className="hub-btn" onClick={() => switchTab("hub")}>
                    {t("hub_back_overview", currentLang)}
                  </button>
                </header>
                {/* Keyed per step so the new step fades in (motion.css). */}
                <div className="hh-content" key={currentTab}>
                  {currentTab !== "results" && <p className="required-hint">{t("required_hint", currentLang)}</p>}
                  <div id="tab-content">
                    {tabContent}
                    <StepFooter />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!wide && screen === "editor" && record && (
        // Ported from buildWorkspaceLayout() in docs/js/app.js, which wraps
        // #tab-nav + <main> in a ".workspace" div at runtime so the rail and
        // content share one flex parent. React needs that wrapper in the
        // JSX itself rather than built imperatively.
        <div className="workspace">
          <nav id="tab-nav">
            <span className="rail-heading">{t("steps_heading", currentLang)}</span>
            {TABS.map((tab) => {
              const state = stepState(record, tab);
              return (
                <button
                  key={tab}
                  type="button"
                  className={`nav-btn step-${state}${tab === currentTab ? " active" : ""}`}
                  onClick={() => switchTab(tab)}
                >
                  <span className="step-icon" aria-hidden="true">
                    <StepIcon state={state} />
                  </span>
                  <span className="step-label">{t(TAB_LABEL_KEY[tab], currentLang)}</span>
                </button>
              );
            })}
          </nav>
          <main>
            {currentTab !== "results" && <p className="required-hint">{t("required_hint", currentLang)}</p>}
            <div id="tab-content">
              {tabContent}
              <StepFooter />
            </div>
          </main>
        </div>
      )}

      {!wide && screen === "history" && (
        <main>
          <FarmerHistoryScreen />
        </main>
      )}

      {!wide && <footer className="app-footer">Fairtrade International — Digital Solutions Unit · cocoa household data capture tool</footer>}

      <ConfirmModal />
      <UpdateBar />
    </>
  );
}
