/* stepSummary.ts
   One line per step for the household rail and the hub ("4 members · 2
   acre cocoa", "475 000 XOF"). Read-only over calcResults(): nothing here
   changes a figure, it only picks which existing one describes the step. */

import type { HouseholdRecord } from "./dataModel";
import type { calcResults } from "./calc";
import { num } from "./calc";
import { fmt } from "./format";
import { t, type Lang } from "./i18n";
import { TABS } from "./tabs";
import { stepState } from "./recordProgress";

type Results = ReturnType<typeof calcResults>;

/** The steps a coach fills in; Results is computed, so it is left out of
 *  every "n of 6 complete" count and every "resume here" pick. */
export const CAPTURE_TABS = TABS.filter((tab) => tab !== "results");

export function stepSummary(record: HouseholdRecord, res: Results, tab: string, lang: Lang): string {
  const cur = record.meta.currencyUnit;
  switch (tab) {
    case "consent": {
      const c = record.consent;
      const n = [c.releaseFI, c.releaseCoop, c.releasePN, c.releaseBuyers].filter(Boolean).length;
      return `${n} ${t("record_of_steps", lang)} 4 ${t("status_releases", lang)}`;
    }
    case "profile": {
      const area = res.profile.totalCocoaArea || num(record.profile.cocoaAreaIms);
      const bits = [`${res.profile.totalMembers} ${t("hub_members", lang)}`];
      if (area) bits.push(`${fmt(area)} ${record.meta.areaUnit} ${t("status_cocoa", lang)}`);
      return bits.join(" · ");
    }
    case "revenues":
      return `${fmt(res.totalRevenueFarm)} ${cur}`;
    case "costs":
      return `${fmt(res.totalCostFarm - res.labour.totalLabourCost)} ${cur}`;
    case "labour":
      return `${fmt(res.labour.totalHhDays)} ${t("status_household_days", lang)} · ${fmt(res.labour.totalHiredDays)} ${t("status_hired_days", lang)}`;
    case "expenditures":
      return `${fmt(res.expenditures.total)} ${cur}`;
    default:
      return "";
  }
}

/** First capture step not marked complete: where "Resume" sends the coach. */
export function resumeStep(record: HouseholdRecord): string | null {
  return CAPTURE_TABS.find((tab) => stepState(record, tab) !== "complete") ?? null;
}

export function incompleteSteps(record: HouseholdRecord): string[] {
  return CAPTURE_TABS.filter((tab) => stepState(record, tab) !== "complete");
}
