/* ListShell.tsx
   Tablet and laptop frame for everything outside a household record:
   Records, Compare, Export, Settings and a farmer's season history
   (design/shell-options HT0). A dark navy menu on the left replaces the
   phone's header bar, tab strip and bottom nav; each screen gets the same
   large page header the household screens use. Phones never render this. */

import type { CSSProperties, ReactNode } from "react";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { LIST_TABS, LIST_TAB_SHORT_KEY, type ListTab } from "../lib/tabs";
import { useOnline } from "../lib/useOnline";
import { Brand } from "./Brand";

const ICONS: Record<ListTab, ReactNode> = {
  records: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  compare: <path d="M5 20V10M12 20V4M19 20v-7" />,
  export: (
    <>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 17v3h16v-3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
};

export function ListShell({ children }: { children: ReactNode }) {
  const lang = useAppStore((s) => s.currentLang);
  const screen = useAppStore((s) => s.screen);
  const listTab = useAppStore((s) => s.listTab);
  const switchListTab = useAppStore((s) => s.switchListTab);
  const goToList = useAppStore((s) => s.goToList);
  // The season history screen belongs to Records.
  const active: ListTab = screen === "history" ? "records" : listTab;

  return (
    <div className="ls-shell">
      <nav className="ls-nav" aria-label={t("app_title", lang)}>
        {/* Grey pill that slides to the chosen section (motion.css). */}
        <span className="nav-pill" aria-hidden="true" style={{ "--i": LIST_TABS.indexOf(active) } as CSSProperties} />
        {LIST_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="ls-nav-btn"
            aria-current={tab === active ? "page" : undefined}
            onClick={() => {
              if (screen !== "list") goToList();
              switchListTab(tab);
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[tab]}
            </svg>
            {t(LIST_TAB_SHORT_KEY[tab], lang)}
          </button>
        ))}
      </nav>
      {/* Keyed per section so the new screen fades in (motion.css). */}
      <div className="ls-main" key={active}>{children}</div>
    </div>
  );
}

/** Large title row shared by the list screens: title, an optional line of
 *  context, and the device-save status on the right. `children` go in a
 *  second row (Records puts its search and "New household" there). */
export function ListHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  const lang = useAppStore((s) => s.currentLang);
  const online = useOnline();
  return (
    <header className="ls-head">
      <div className="ls-head-row">
        <div className="ls-head-block">
          <Brand />
          <div className="ls-head-titles">
            <h1>{title}</h1>
            {sub && <span className="ls-head-sub">{sub}</span>}
          </div>
        </div>
        <span className="ls-status">
          <span className="ls-status-dot" aria-hidden="true" />
          {t(online ? "ls_online_saved" : "ls_offline_saved", lang)}
        </span>
      </div>
      {children && <div className="ls-head-tools">{children}</div>}
    </header>
  );
}
