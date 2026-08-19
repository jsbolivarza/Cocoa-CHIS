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
import "./style.css";

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

  useEffect(() => {
    init();
  }, [init]);

  // Ported from the body.classList.toggle("screen-list"/"screen-editor")
  // calls in docs/js/app.js. CSS uses these (.screen-list .editor-only,
  // body.screen-list's phone bottom-nav padding) to scope shell chrome to
  // one screen without every element needing its own conditional.
  useEffect(() => {
    document.body.classList.toggle("screen-list", screen === "list");
    document.body.classList.toggle("screen-editor", screen === "editor");
  }, [screen]);

  if (!loaded) return <div className="panel">…</div>;

  return (
    <>
      <AppBar />

      {screen === "list" && (
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

      {screen === "editor" && record && (
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
            <p className="required-hint">{t("required_hint", currentLang)}</p>
            <div id="tab-content">
              {currentTab === "consent" && <ConsentTab />}
              {currentTab === "profile" && <ProfileTab />}
              {currentTab === "revenues" && <RevenuesTab />}
              {currentTab === "costs" && <CostsTab />}
              {currentTab === "labour" && <LabourTab />}
              {currentTab === "expenditures" && <ExpendituresTab />}
              {currentTab === "results" && <ResultsTab />}
              <StepFooter />
            </div>
          </main>
        </div>
      )}

      {screen === "history" && (
        <main>
          <FarmerHistoryScreen />
        </main>
      )}

      <footer className="app-footer">Fairtrade International — Digital Solutions Unit · cocoa household data capture tool</footer>

      <ConfirmModal />
      <UpdateBar />
    </>
  );
}
