/* HouseholdRail.tsx
   Tablet and laptop shell for an open record (design/shell-options/TRail):
   who is being interviewed, every step with its status and a one-line
   summary, and the money flow so far. Replaces both the app bar and the
   old step rail on wide screens; phones keep those. `compact` collapses it
   to an icon strip so steps with wide tables get the room. */

import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { TAB_LABEL_KEY } from "../lib/tabs";
import { stepState } from "../lib/recordProgress";
import { calcResults } from "../lib/calc";
import { fmt } from "../lib/format";
import { CAPTURE_TABS, incompleteSteps, stepSummary } from "../lib/stepSummary";

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function clock(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export function HouseholdRail({ compact }: { compact: boolean }) {
  const record = useAppStore((s) => s.record);
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const currentTab = useAppStore((s) => s.currentTab);
  const switchTab = useAppStore((s) => s.switchTab);
  const goToList = useAppStore((s) => s.goToList);
  const openRecord = useAppStore((s) => s.openRecord);
  const saveStatus = useAppStore((s) => s.saveStatus);
  const savedAt = useAppStore((s) => s.savedAt);
  const online = useOnline();
  if (!record) return null;

  const res = calcResults(record);
  const name = record.profile.producerName || t("unnamed_household", lang);
  const subBits = [record.profile.producerCode, record.profile.coopName, record.profile.village].filter(Boolean);
  // Only worth showing when there is another season to switch to.
  const linked = record.meta.farmerId
    ? Object.values(records).filter((r) => r.meta.farmerId === record.meta.farmerId)
    : [record];
  const seasons = linked.length > 1
    ? linked.sort((a, b) => (b.meta.season || "").localeCompare(a.meta.season || ""))
    : [];
  const status = `${t(online ? "conn_online" : "conn_offline", lang)} · ${
    saveStatus === "saving" ? t("btn_saving", lang) : `${t("btn_save", lang)} ${clock(savedAt)}`
  }`;
  const open = incompleteSteps(record);

  const steps = CAPTURE_TABS.map((tab) => {
    const state = stepState(record, tab);
    const sub = state === "empty" ? t("status_not_started", lang) : stepSummary(record, res, tab, lang);
    return { tab, state, sub, label: t(TAB_LABEL_KEY[tab], lang) };
  });
  const resultsSub = open.length
    ? `${open.length} ${t("status_results_open", lang)}`
    : `${t("res_profit", lang)} ${fmt(res.profitFarm)}`;

  const fin = res.totalRevenueFarm;
  const fout = res.totalCostFarm;
  const net = res.profitFarm;
  const scale = Math.max(fin, fout, 1);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;
  const allDone = open.length === 0;

  return (
    <aside className={`hh-rail${compact ? " is-compact" : ""}`} aria-label={t("hub_household_heading", lang)}>
      <div className="hh-rail-head">
        <div className="hh-rail-top">
          <button type="button" className="hh-rail-back" onClick={goToList} aria-label={t("btn_my_records", lang)}>
            <BackIcon />
            {!compact && t("btn_my_records", lang)}
          </button>
          {!compact && (
            <span className="hh-rail-status" role="status">
              <span className={`hh-dot${online ? " is-online" : ""}`} aria-hidden="true" />
              {status}
            </span>
          )}
        </div>
        {compact ? (
          <>
            <button type="button" className="hh-rail-avatar" onClick={() => switchTab("hub")} aria-label={`${name}, ${t("hub_title", lang)}`}>
              {initials(name).toUpperCase()}
            </button>
            <span className={`hh-dot${online ? " is-online" : ""}`} title={status} aria-label={status} role="status" />
          </>
        ) : (
          <>
            <button type="button" className="hh-rail-name" onClick={() => switchTab("hub")} aria-current={currentTab === "hub" ? "page" : undefined}>
              <span className="hh-rail-title">{name}</span>
              {subBits.length > 0 && <span className="hh-rail-sub">{subBits.join(" · ")}</span>}
            </button>
            {seasons.length > 0 && (
              <div className="hh-seasons" role="group" aria-label={t("season_label", lang)}>
                {seasons.map((r) => {
                  const label = r.meta.season || t("season_not_set", lang);
                  return r.meta.id === record.meta.id ? (
                    <span key={r.meta.id} className="hh-season is-current">{label}</span>
                  ) : (
                    <button key={r.meta.id} type="button" className="hh-season" onClick={() => openRecord(r.meta.id, currentTab)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <nav className="hh-steps" aria-label={t("steps_heading", lang)}>
        {steps.map((s, i) => {
          const isCurrent = s.tab === currentTab;
          const look = s.state === "complete" ? "done" : s.state === "started" && !isCurrent ? "attention" : isCurrent ? "current" : "todo";
          return (
            <button
              key={s.tab}
              type="button"
              className={`hh-step is-${look}${isCurrent ? " is-selected" : ""}`}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={compact ? `${s.label}: ${s.sub}` : undefined}
              title={compact ? `${s.label}: ${s.sub}` : undefined}
              onClick={() => switchTab(s.tab)}
            >
              <span className="hh-step-dot" aria-hidden="true">
                {s.state === "complete" ? <CheckIcon /> : s.tab === "consent" ? "C" : i}
              </span>
              {!compact && (
                <span className="hh-step-text">
                  <span className="hh-step-label">{s.label}</span>
                  <span className="hh-step-sub">{s.sub}</span>
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          className={`hh-step is-results${currentTab === "results" ? " is-selected" : ""}`}
          aria-current={currentTab === "results" ? "page" : undefined}
          aria-label={compact ? `${t("tab_results", lang)}: ${resultsSub}` : undefined}
          title={compact ? `${t("tab_results", lang)}: ${resultsSub}` : undefined}
          onClick={() => switchTab("results")}
        >
          <span className="hh-step-dot" aria-hidden="true">6</span>
          {!compact && (
            <span className="hh-step-text">
              <span className="hh-step-label">{t("tab_results", lang)}</span>
              <span className={`hh-step-sub${open.length ? " is-warn" : " is-good"}`}>{resultsSub}</span>
            </span>
          )}
        </button>
      </nav>

      {!compact && (fin > 0 ? (
        <section className="hh-flow" aria-label={t("flow_heading", lang)}>
          <span className="hh-flow-title">{t(allDone ? "flow_heading" : "flow_heading_so_far", lang)}</span>
          <div className="hh-flow-grid">
            <span>{t("flow_in", lang)}</span>
            <span className="hh-bar"><span className="hh-bar-in" style={{ width: pct(fin) }} /></span>
            <span className="num">+{fmt(fin)}</span>
            <span>{t("flow_out", lang)}</span>
            <span className="hh-bar"><span className="hh-bar-out" style={{ width: pct(fout), marginLeft: `calc(100% - ${pct(fout)})` }} /></span>
            <span className="num">{fout > 0 ? `−${fmt(fout)}` : "—"}</span>
            <span className="hh-flow-net">{t("flow_net", lang)}</span>
            <span className="hh-bar"><span className={net < 0 ? "hh-bar-neg" : "hh-bar-net"} style={{ width: pct(Math.abs(net)) }} /></span>
            <span className="num hh-flow-net">{fmt(net)}</span>
          </div>
          <span className="hh-flow-note">{record.meta.currencyUnit} · {t("flow_note", lang)}</span>
        </section>
      ) : (
        <p className="hh-flow-empty">{t("flow_empty", lang)}</p>
      ))}
    </aside>
  );
}
