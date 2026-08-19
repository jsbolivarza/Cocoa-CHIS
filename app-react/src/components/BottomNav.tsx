/* BottomNav.tsx
   Ported from buildBottomNav()/renderBottomNav() in docs/js/app.js — the
   list screen's only navigation on a phone. style.css hides nav#list-nav
   and shows this instead below the phone breakpoint, so the two bars can
   never stack (see the ".bottom-nav" comment in style.css). */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { LIST_TABS, LIST_TAB_SHORT_KEY, type ListTab } from "../lib/tabs";

function BottomNavIcon({ tab }: { tab: ListTab }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (tab) {
    case "records":
      return (
        <svg {...shared}>
          <path d="M4 4h16v16H4z" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "compare":
      return (
        <svg {...shared}>
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );
    case "export":
      return (
        <svg {...shared}>
          <path d="M12 3v12" />
          <path d="M8 11l4 4 4-4" />
          <path d="M4 17v3h16v-3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
      );
  }
}

export function BottomNav() {
  const listTab = useAppStore((s) => s.listTab);
  const switchListTab = useAppStore((s) => s.switchListTab);
  const currentLang = useAppStore((s) => s.currentLang);

  return (
    <nav id="bottom-nav" className="bottom-nav">
      {LIST_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`bottom-nav-btn ${tab === listTab ? "active" : ""}`}
          aria-current={tab === listTab ? "page" : undefined}
          onClick={() => switchListTab(tab)}
        >
          <BottomNavIcon tab={tab} />
          <span>{t(LIST_TAB_SHORT_KEY[tab], currentLang)}</span>
        </button>
      ))}
    </nav>
  );
}
