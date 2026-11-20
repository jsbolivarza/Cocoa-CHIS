import type { HouseholdRecord } from "./dataModel";
import { emptyRecord } from "./dataModel";
import { TABS, TAB_SECTION } from "./tabs";

export type StepState = "complete" | "started" | "empty";

// Lazy, module-level like docs/js/app.js's EMPTY_SECTION_CACHE: built once,
// reused as the "untouched" baseline every step's section is diffed against.
let emptySectionCache: HouseholdRecord | null = null;

function stepHasData(record: HouseholdRecord, tab: string): boolean {
  const section = TAB_SECTION[tab];
  if (!section) return false;
  if (!emptySectionCache) emptySectionCache = emptyRecord();
  const key = section as keyof HouseholdRecord;
  return JSON.stringify(record[key]) !== JSON.stringify(emptySectionCache[key]);
}

/** Ported from the state computation inside renderNav() in docs/js/app.js. */
export function stepState(record: HouseholdRecord, tab: string): StepState {
  const done = Array.isArray(record.meta.completedSteps) ? record.meta.completedSteps : [];
  if (done.includes(tab)) return "complete";
  return stepHasData(record, tab) ? "started" : "empty";
}

/** How many of the steps this record has been explicitly marked complete on.
 *  Counts the six capture steps only: Results is read-only, can't be marked
 *  and must not count. The hub, Records tags and the phone header all read
 *  this one number, so a coach never sees "0 of 6" and "0 of 7" side by side. */
export function recordProgress(record: HouseholdRecord) {
  const steps: string[] = TABS.filter((tab) => tab !== "results");
  const marked = Array.isArray(record.meta.completedSteps) ? record.meta.completedSteps : [];
  const done = steps.filter((tab) => marked.includes(tab)).length;
  const total = steps.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function formatUpdatedAt(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}
