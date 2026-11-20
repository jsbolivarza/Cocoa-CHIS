/* SeasonCompareCard.tsx
   Season comparison on the household overview: five figures of this season
   beside the same farmer's previous season (same meta.farmerId, the latest
   season label before this one), as a small aligned table.

   The card's job is data quality, not good/bad news: a change is plain
   signed text in body ink (more area or a lower price is not good or bad in
   itself, so no arrows and no red/green). Only a change big enough to be
   worth confirming while the farmer is still there gets the amber
   "check with farmer" chip, the same amber that means "needs attention"
   everywhere else, so no new colour competes with the money flow chart.
   The full chart stays on the farmer history screen, one tap away.
   Read-only; every figure is one the steps entered or calc.ts derives. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { calcResults, num } from "../lib/calc";
import { fmt } from "../lib/format";
import type { HouseholdRecord } from "../lib/dataModel";

/** Latest season of the same farmer that comes before this one. Season
 *  labels are "YYYY/YYYY", so string order is season order. A record with
 *  no season can't be placed, so it neither shows nor feeds the card. */
function previousSeason(record: HouseholdRecord, records: Record<string, HouseholdRecord>): HouseholdRecord | null {
  const season = record.meta.season;
  if (!season) return null;
  let best: HouseholdRecord | null = null;
  for (const r of Object.values(records)) {
    if (r.meta.id === record.meta.id || r.meta.farmerId !== record.meta.farmerId) continue;
    if (!r.meta.season || r.meta.season >= season) continue;
    if (!best || r.meta.season > best.meta.season) best = r;
  }
  return best;
}

interface Figure {
  key: string;
  labelKey: string;
  value: (rec: HouseholdRecord) => number | null;
  unit: (rec: HouseholdRecord) => string;
  /** Share of change (0.25 = 25 %) from which the coach is asked to check.
   *  Placeholders until the validation rules proposal sets real limits. */
  checkAt: number;
}

/** A typed field left blank is "not entered", not zero. */
const typed = (v: unknown): number | null => (v === "" || v == null ? null : num(v));
/** A derived figure of 0 means its inputs are missing (no plots, no sales). */
const derived = (v: number): number | null => (isFinite(v) && v !== 0 ? v : null);

const FIGURES: Figure[] = [
  { key: "volume", labelKey: "cocoa_volume_produced", value: (r) => typed(r.profile.cocoaVolumeProduced), unit: (r) => r.meta.volumeUnit, checkAt: 0.25 },
  { key: "yield", labelKey: "cmp_yield", value: (r) => derived(calcResults(r).cocoaYieldPerArea), unit: (r) => `${r.meta.volumeUnit}/${r.meta.areaUnit}`, checkAt: 0.25 },
  { key: "price", labelKey: "farmgate_price_main", value: (r) => typed(r.profile.farmgatePriceMain), unit: (r) => `${r.meta.currencyUnit}/${r.meta.volumeUnit}`, checkAt: 0.25 },
  { key: "area", labelKey: "cocoa_area_ims", value: (r) => typed(r.profile.cocoaAreaIms), unit: (r) => r.meta.areaUnit, checkAt: 0.25 },
  { key: "income", labelKey: "cmp_net_farm", value: (r) => derived(calcResults(r).profitFarm), unit: (r) => r.meta.currencyUnit, checkAt: 0.5 },
];

const same = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

export function SeasonCompareCard({ record, complete }: { record: HouseholdRecord; complete: boolean }) {
  const records = useAppStore((s) => s.records);
  const lang = useAppStore((s) => s.currentLang);
  const openFarmerHistory = useAppStore((s) => s.openFarmerHistory);

  const prev = previousSeason(record, records);
  if (!prev) return null;

  const cell = (v: number | null, unit: string, showUnit: boolean) =>
    v == null ? "—" : `${fmt(v)}${showUnit && unit ? ` ${unit}` : ""}`;

  const rows = FIGURES.map((f) => {
    const cur = f.value(record);
    const old = f.value(prev);
    const curUnit = f.unit(record);
    const oldUnit = f.unit(prev);
    const comparable = same(curUnit, oldUnit);
    const share = cur != null && old != null && comparable && old !== 0 ? (cur - old) / Math.abs(old) : null;
    const pct = share == null ? null : Math.round(share * 100);
    return {
      f,
      cur,
      old,
      curUnit,
      oldUnit,
      comparable,
      share,
      // Under half a percent reads as no change: show a quiet dash.
      change: pct == null ? null : pct === 0 ? "–" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`,
      check: share != null && Math.abs(share) >= f.checkAt,
    };
  });

  const unitsDiffer = rows.some((r) => r.old != null && r.cur != null && !r.comparable);
  const anyCheck = rows.some((r) => r.check);
  const vol = rows.find((r) => r.f.key === "volume");
  const yld = rows.find((r) => r.f.key === "yield");
  // Volume moved a lot but yield barely did: area must have moved with it,
  // which is worth a look at the plots (yield comes from plot areas).
  const volumeWithoutYield = !!vol?.check && yld?.share != null && Math.abs(yld.share) < 0.05;

  return (
    <section className="hub-card hub-seasons">
      <div className="hub-card-head">
        <h2>
          {t("hub_since", lang)} {prev.meta.season}
        </h2>
        <button type="button" className="hub-link" onClick={() => openFarmerHistory(record.meta.farmerId)}>
          {t("hub_see_all_seasons", lang)}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <table className="season-table">
        <thead>
          <tr>
            <th scope="col"><span className="visually-hidden">{t("hub_farm_heading", lang)}</span></th>
            <th scope="col" className="num">{prev.meta.season}</th>
            <th scope="col" className="num is-current">{record.meta.season}</th>
            <th scope="col" className="num">{t("hub_col_change", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.f.key}>
              <th scope="row">
                {t(r.f.labelKey, lang)}
                <span className="season-unit">
                  {r.curUnit}
                  {r.f.key === "income" && !complete && r.cur != null ? ` · ${t("hub_so_far", lang)}` : ""}
                </span>
              </th>
              <td className="num">{cell(r.old, r.oldUnit, !r.comparable)}</td>
              <td className="num is-current">{cell(r.cur, r.curUnit, !r.comparable)}</td>
              <td className="num">
                {r.check ? (
                  <span className="season-check">
                    <strong>{r.change}</strong>
                    <span>{t("hub_check", lang)}</span>
                  </span>
                ) : (
                  <span className={r.change === "–" || r.change == null ? "season-flat" : "season-change"}>{r.change ?? "—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {volumeWithoutYield && <p className="hub-note">{t("hub_volume_yield_note", lang)}</p>}
      {unitsDiffer && <p className="hub-note">{t("hub_units_differ", lang)}</p>}
      {anyCheck && !volumeWithoutYield && <p className="hub-note">{t("hub_check_help", lang)}</p>}
    </section>
  );
}
