import type { HouseholdRecord } from "./dataModel";
import { TABS } from "./tabs";

/** How many of the steps this record has been explicitly marked complete on.
 *  Ported from recordProgress() in docs/js/app.js. `total` tracks TABS.length,
 *  so it reads honestly low (e.g. "0 of 1") until more tabs are rebuilt —
 *  not a bug, just where the migration is. */
export function recordProgress(record: HouseholdRecord) {
  const done = Array.isArray(record.meta.completedSteps) ? record.meta.completedSteps.length : 0;
  const total = TABS.length;
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
