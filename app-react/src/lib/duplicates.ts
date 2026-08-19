/* duplicates.ts
   Safety net for a coach who creates a fresh record for a farmer already on
   this device instead of using "Start new season" — not in the vanilla
   app. Producer code is checked first since it's meant to be the stable
   cross-record identifier (see producer_code_help); producer name is a
   fallback for records with no code entered yet. */

import type { HouseholdRecord } from "./dataModel";

export interface DuplicateMatch {
  farmerId: string;
  producerName: string;
  coopName: string;
}

function norm(s: string): string {
  return String(s || "").trim().toLowerCase();
}

export function findPotentialDuplicate(
  records: Record<string, HouseholdRecord>,
  current: HouseholdRecord
): DuplicateMatch | null {
  const code = norm(current.profile.producerCode);
  const name = norm(current.profile.producerName);
  if (!code && !name) return null;

  // Only ever compares against a DIFFERENT farmer group — once linked (or
  // already the same group), there is nothing to warn about.
  const others = Object.values(records).filter(
    (r) => r.meta.id !== current.meta.id && r.meta.farmerId !== current.meta.farmerId
  );

  const byCode = code ? others.find((r) => norm(r.profile.producerCode) === code) : undefined;
  const match = byCode || (name ? others.find((r) => norm(r.profile.producerName) === name) : undefined);
  if (!match) return null;

  return { farmerId: match.meta.farmerId, producerName: match.profile.producerName, coopName: match.profile.coopName };
}
