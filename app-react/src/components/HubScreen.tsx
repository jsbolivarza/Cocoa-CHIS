/* HubScreen.tsx
   Household overview (design/shell-options/HT1-hub): where the interview
   stands, where to resume, which steps were left without being marked
   complete, and the farm and household facts already captured. Read-only;
   every figure is one the steps themselves entered. */

import { useAppStore } from "../store/appStore";
import { t, optLabel } from "../lib/i18n";
import { TAB_LABEL_KEY } from "../lib/tabs";
import { stepState } from "../lib/recordProgress";
import { CAPTURE_TABS, resumeStep } from "../lib/stepSummary";
import { num } from "../lib/calc";
import { fmt } from "../lib/format";
import type { TableRow } from "../lib/dataModel";
import { SeasonCompareCard } from "./SeasonCompareCard";

const NextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function HubScreen() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  const switchTab = useAppStore((s) => s.switchTab);
  if (!record) return null;

  const p = record.profile;
  const states = CAPTURE_TABS.map((tab) => ({ tab, state: stepState(record, tab) }));
  const doneCount = states.filter((s) => s.state === "complete").length;
  const resume = resumeStep(record);
  const resumeStarted = resume ? stepState(record, resume) === "started" : false;
  const attention = states.filter((s) => s.state === "started" && s.tab !== resume).map((s) => s.tab);
  const label = (tab: string) => t(TAB_LABEL_KEY[tab], lang);

  const units = [record.meta.currencyUnit, record.meta.areaUnit, record.meta.volumeUnit].filter(Boolean).join(" / ");
  const sub = [p.coopName, p.village, units].filter(Boolean).join(" · ");
  const area = (v: unknown, how: string) =>
    v === "" || v == null ? "—" : `${fmt(num(v))} ${record.meta.areaUnit}${how ? ` · ${t(how, lang)}` : ""}`;
  const plain = (v: unknown, unit: string) => (v === "" || v == null ? "—" : `${fmt(num(v))} ${unit}`);

  const members = [
    ...(p.householdWorking || []).filter((r) => r.name).map((r) => ({ r, works: true })),
    ...(p.householdNotWorking || []).filter((r) => r.name).map((r) => ({ r, works: false })),
  ];
  const memberDetail = (r: TableRow, works: boolean) =>
    [r.relationship ? optLabel("family_relationship", String(r.relationship), lang) : "", r.age !== "" && r.age != null ? String(r.age) : "", works ? t("hub_works_on_farm", lang) : ""]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="hub">
      <header className="page-head">
        <div className="page-head-titles">
          <h1>{t("hub_title", lang)}{record.meta.season ? ` · ${record.meta.season}` : ""}</h1>
          <span className="page-head-sub">
            {doneCount} {t("record_of_steps", lang)} {CAPTURE_TABS.length} {t("hub_steps_complete", lang)}
            {sub ? ` · ${sub}` : ""}
          </span>
        </div>
        <div className="hub-progress" aria-hidden="true">
          {states.map((s) => (
            <span key={s.tab} className={`is-${s.state === "complete" ? "done" : s.tab === resume ? "current" : s.state === "started" ? "attention" : "todo"}`} />
          ))}
        </div>
      </header>

      <div className="hub-grid">
        {/* One card for "what now": the next step stands out; other steps
            that have data but aren't marked complete are a quiet list
            beneath it, not a second amber card of equal buttons. */}
        {resume ? (
          <section className="hub-card is-current hub-next">
            <div className="hub-next-main">
              <div>
                <h2>{t(resumeStarted || doneCount ? "hub_resume_heading" : "hub_start_heading", lang)}</h2>
                <p>
                  {label(resume)} {t(resumeStarted ? "hub_resume_in_progress" : "hub_resume_next", lang)}
                </p>
              </div>
              <button type="button" className="hub-btn is-primary" onClick={() => switchTab(resume)}>
                {t("hub_resume_btn", lang)}: {label(resume)}
                <NextIcon />
              </button>
            </div>
            {attention.length > 0 && (
              <div className="hub-next-open">
                <span>{t("hub_also_open", lang)}</span>
                <div className="hub-btn-row">
                  {attention.map((tab) => (
                    <button key={tab} type="button" className="hub-btn is-quiet" onClick={() => switchTab(tab)}>
                      {label(tab)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="hub-card is-done">
            <h2>{t("hub_all_done_heading", lang)}</h2>
            <p>{t("hub_all_done_text", lang)}</p>
            <button type="button" className="hub-btn is-primary" onClick={() => switchTab("results")}>
              {t("hub_open_results", lang)}
              <NextIcon />
            </button>
          </section>
        )}

        <section className="hub-card">
          <h2>{t("hub_farm_heading", lang)}</h2>
          <dl className="hub-kv">
            <div><dt>{t("cocoa_area_ims", lang)}</dt><dd className="num">{area(p.cocoaAreaIms, p.cocoaAreaImsMeasured)}</dd></div>
            <div><dt>{t("total_farm_area_ims", lang)}</dt><dd className="num">{area(p.totalFarmAreaIms, p.totalFarmAreaImsMeasured)}</dd></div>
            <div><dt>{t("cocoa_volume_produced", lang)}</dt><dd className="num">{plain(p.cocoaVolumeProduced, record.meta.volumeUnit)}</dd></div>
            <div><dt>{t("farmgate_price_main", lang)}</dt><dd className="num">{plain(p.farmgatePriceMain, `${record.meta.currencyUnit}/${record.meta.volumeUnit}`)}</dd></div>
          </dl>
        </section>

        <section className="hub-card">
          <h2>{t("hub_household_heading", lang)}{members.length ? ` · ${members.length} ${t("hub_members", lang)}` : ""}</h2>
          {members.length ? (
            <dl className="hub-kv">
              {members.map(({ r, works }, i) => (
                <div key={i}><dt>{String(r.name)}</dt><dd className="is-muted">{memberDetail(r, works)}</dd></div>
              ))}
            </dl>
          ) : (
            <p className="is-muted">{t("hub_no_members", lang)}</p>
          )}
        </section>

        <SeasonCompareCard record={record} complete={doneCount === CAPTURE_TABS.length} />
      </div>
    </div>
  );
}
