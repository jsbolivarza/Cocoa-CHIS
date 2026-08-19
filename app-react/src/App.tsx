import { useEffect } from "react";
import { useAppStore } from "./store/appStore";
import { t } from "./lib/i18n";
import { TABS, TAB_LABEL_KEY, LIST_TABS, LIST_TAB_LABEL_KEY } from "./lib/tabs";
import { AppBar } from "./components/AppBar";
import { ConfirmModal } from "./components/ConfirmModal";
import { ConsentTab } from "./components/ConsentTab";
import { RecordsScreen } from "./components/RecordsScreen";
import { CompareScreen } from "./components/CompareScreen";
import { ExportScreen } from "./components/ExportScreen";
import { SettingsScreen } from "./components/SettingsScreen";
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

  if (!loaded) return <div className="panel">…</div>;

  return (
    <>
      <AppBar />

      {screen === "list" && (
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
      )}

      {screen === "editor" && (
        <nav id="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`nav-btn ${tab === currentTab ? "active" : ""}`}
              onClick={() => switchTab(tab)}
            >
              {t(TAB_LABEL_KEY[tab], currentLang)}
            </button>
          ))}
        </nav>
      )}

      <main>
        {screen === "list" ? (
          <>
            {listTab === "records" && <RecordsScreen />}
            {listTab === "compare" && <CompareScreen />}
            {listTab === "export" && <ExportScreen />}
            {listTab === "settings" && <SettingsScreen />}
          </>
        ) : (
          <div id="tab-content">{record && currentTab === "consent" && <ConsentTab />}</div>
        )}
      </main>

      <ConfirmModal />
    </>
  );
}
