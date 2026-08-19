/* compare.ts
   Ported from currencyKey()/compareSummary() in docs/js/app.js. Reduces one
   full record down to the handful of figures the Compare screen's table and
   chart actually need. */

import type { HouseholdRecord } from "./dataModel";
import { calcResults } from "./calc";

export function currencyKey(rec: HouseholdRecord): string {
  return String(rec.meta.currencyUnit || "").trim().toUpperCase();
}

export interface CompareSummary {
  id: string;
  farmerId: string;
  season: string;
  createdAt: string;
  producer: string;
  coop: string;
  village: string;
  programme: string;
  currency: string;
  areaUnit: string;
  volumeUnit: string;
  cocoaArea: number;
  yieldPerArea: number;
  costPerKg: number;
  pricePerKg: number;
  cocoaRevenue: number;
  netCocoa: number;
  netFarm: number;
  expenditure: number;
  members: number;
  labourDays: number;
  returnOnLabour: number;
  /** What a kilo actually earns after it has been produced. */
  marginPerKg: number | null;
  /** Whether the farm covered what the household spent. */
  gap: number;
  /** Net farm income spread across everyone it has to support. */
  perPerson: number | null;
}

export function compareSummary(rec: HouseholdRecord): CompareSummary {
  const r = calcResults(rec);
  const members = r.profile.totalMembers;
  const price = r.revenues.cocoa.avgPrice;
  const costKg = r.costOfProductionPerKg;
  return {
    id: rec.meta.id,
    farmerId: rec.meta.farmerId,
    season: rec.meta.season,
    createdAt: rec.meta.createdAt,
    producer: rec.profile.producerName,
    coop: rec.profile.coopName,
    village: rec.profile.village,
    programme: rec.profile.programme,
    currency: currencyKey(rec),
    areaUnit: rec.meta.areaUnit,
    volumeUnit: rec.meta.volumeUnit,
    cocoaArea: r.profile.totalCocoaArea,
    yieldPerArea: r.cocoaYieldPerArea,
    costPerKg: costKg,
    pricePerKg: price,
    cocoaRevenue: r.revenues.totalCocoaRevenue,
    netCocoa: r.profitCocoa,
    netFarm: r.profitFarm,
    expenditure: r.expenditures.total,
    members,
    labourDays: (r.labour.totalHhDaysCocoa || 0) + (r.labour.totalHiredDaysCocoa || 0),
    returnOnLabour: r.returnOnLabourCocoa,
    marginPerKg: price == null || costKg == null ? null : price - costKg,
    gap: r.profitFarm - (r.expenditures.total || 0),
    perPerson: members > 0 ? r.profitFarm / members : null,
  };
}
