/* StepIcon.tsx
   Ported from the STEP_ICON inline SVGs in docs/js/app.js — Tabler-style
   glyphs, kept as inline SVG rather than a webfont. */

import type { StepState } from "../lib/recordProgress";

export function StepIcon({ state }: { state: StepState }) {
  if (state === "complete") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (state === "started") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
