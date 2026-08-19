/* format.ts
   Ported from fmt() in docs/js/app.js. */

export function fmt(n: unknown): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
