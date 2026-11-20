/* BottomNav.tsx
   Ported from buildBottomNav()/renderBottomNav() in docs/js/app.js — the
   list screen's only navigation on a phone. style.css hides nav#list-nav
   and shows this instead below the phone breakpoint, so the two bars can
   never stack (see the ".bottom-nav" comment in style.css). */

import type { CSSProperties } from "react";
import { NavIcon } from "./NavIcon";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { LIST_TABS, LIST_TAB_SHORT_KEY } from "../lib/tabs";

export function BottomNav() {
  const listTab = useAppStore((s) => s.listTab);
  const switchListTab = useAppStore((s) => s.switchListTab);
  const currentLang = useAppStore((s) => s.currentLang);

  return (
    <nav id="bottom-nav" className="bottom-nav">
      {/* Grey pill that slides to the chosen section (motion.css). */}
      <span className="nav-pill" aria-hidden="true" style={{ "--i": LIST_TABS.indexOf(listTab) } as CSSProperties} />
      {LIST_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`bottom-nav-btn ${tab === listTab ? "active" : ""}`}
          aria-current={tab === listTab ? "page" : undefined}
          onClick={() => switchListTab(tab)}
        >
          <NavIcon tab={tab} size={22} />
          <span>{t(LIST_TAB_SHORT_KEY[tab], currentLang)}</span>
        </button>
      ))}
    </nav>
  );
}
