/* duplicates.ts
   Safety net for a coach who creates a fresh record for a farmer already on
   this device instead of using "Start new season" — not in the vanilla
   app.

   Rules (JB 20.11.26: several members can share a name, so a name alone
   must not suggest linking two people):
   - same cooperative + same member internal code (producerCode) → "strong":
     member codes are given per cooperative, so this is the same member;
   - both records have a member code but they differ → never a match, even
     with the same name: different members;
   - same cooperative + same name, and at least one record has no member
     code yet → "possible": the coach checks the code before linking;
   - different cooperatives → never a match.
   A record whose cooperative is blank can still match on code or name with
   a record whose cooperative is blank too (both unknown, not different). */

import type { HouseholdRecord } from "./dataModel";

export interface DuplicateMatch {
  farmerId: string;
  /** strong = same coop + same member code; possible = same coop + same
   *  name with a member code missing on one side. */
  kind: "strong" | "possible";
  producerName: string;
  producerCode: string;
  coopName: string;
  village: string;
  /** Season labels already captured for that farmer, newest first. */
  seasons: string[];
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
  const coop = norm(current.profile.coopName);
  if (!code && !name) return null;

  // Only ever compares against a DIFFERENT farmer group — once linked (or
  // already the same group), there is nothing to warn about — and only
  // within the same cooperative.
  const others = Object.values(records).filter(
    (r) =>
      r.meta.id !== current.meta.id &&
      r.meta.farmerId !== current.meta.farmerId &&
      norm(r.profile.coopName) === coop
  );

  let kind: DuplicateMatch["kind"] = "strong";
  let match = code ? others.find((r) => norm(r.profile.producerCode) === code) : undefined;
  if (!match && name) {
    kind = "possible";
    match = others.find(
      (r) => norm(r.profile.producerName) === name && (!code || !norm(r.profile.producerCode))
    );
  }
  if (!match) return null;

  const seasons = Object.values(records)
    .filter((r) => r.meta.farmerId === match!.meta.farmerId)
    .map((r) => r.meta.season)
    .filter(Boolean)
    .sort()
    .reverse();

  return {
    farmerId: match.meta.farmerId,
    kind,
    producerName: match.profile.producerName,
    producerCode: match.profile.producerCode,
    coopName: match.profile.coopName,
    village: match.profile.village,
    seasons,
  };
}
