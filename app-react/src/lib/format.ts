/* format.ts
   Ported from fmt() in docs/js/app.js. */

export function fmt(n: unknown): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Display rule (design review 20.11.26): amounts of money in whole units
 *  (87,035 next to 49,256.45 looked like an error); everything else keeps
 *  up to 2 decimals (2.42 hectare, 8.71 XOF/kg). Display only: calc.ts,
 *  the CSV and the upload keep full precision. `isMoney` = the unit is the
 *  record's currency on its own (per-kg units contain "/"). */
export function fmtUnit(n: unknown, unit: string | undefined, currency: string | undefined): string {
  const isMoney = !!unit && !!currency && unit.trim().toUpperCase() === currency.trim().toUpperCase();
  if (isMoney && typeof n === "number" && isFinite(n)) return Math.round(n).toLocaleString();
  return fmt(n);
}
