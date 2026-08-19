/* seasons.ts
   Standardized cocoa-season labels ("2024/2025"), generated from the same
   October-September cocoa season boundary already referenced elsewhere in
   the app (see season_note in i18n.ts) — a closed picklist instead of free
   text, so two captures of the same season can never end up as different
   strings by typo (which would otherwise silently break season filtering
   and the Farmer History grouping). Not in the vanilla app. */

function seasonStartYear(d: Date): number {
  return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1; // month 9 = October (0-indexed)
}

export function seasonLabel(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

/** A handful of years around today — enough for backdated entry and next
 *  season's early capture, without an unbounded list. */
export function seasonOptions(now: Date = new Date()): string[] {
  const start = seasonStartYear(now);
  const options: string[] = [];
  for (let offset = -4; offset <= 1; offset++) options.push(seasonLabel(start + offset));
  return options;
}

/** Keeps a record's existing season selectable even if it falls outside
 *  the generated range (older data, or a value carried over before this
 *  picklist existed) — never silently hides what's already stored. */
export function seasonOptionsWithCurrent(current: string, now: Date = new Date()): string[] {
  const options = seasonOptions(now);
  return current && !options.includes(current) ? [current, ...options] : options;
}
