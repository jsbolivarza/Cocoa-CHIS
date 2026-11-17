// 50 test household records (34 farmers, 16 with a second season), built
// with the app's own emptyRecord() so the format matches exactly.
// Run through run.mjs, not directly (it prepares ./_lib).
import { writeFileSync } from "node:fs";
import { emptyRecord, type HouseholdRecord, type TableRow } from "./_lib/dataModel.ts";
import { calcResults } from "./_lib/calc.ts";

// Seeded random numbers, so the same file comes out every run.
let seed = 20261117;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a: number, b: number) => a + rnd() * (b - a);
const int = (a: number, b: number) => Math.round(between(a, b));
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const round = (v: number, step: number) => Math.round(v / step) * step;

const COOPS = [
  { name: "COOPAZOL", prefix: "AZO", flo: "FLO-31245", coach: "Koffi Brou", villages: ["Daloa", "Gboguhé", "Zaïbo"] },
  { name: "SCOOPCA", prefix: "SCO", flo: "FLO-28811", coach: "Aya Konan", villages: ["Soubré", "Méagui", "Okrouyo"] },
  { name: "ECAM", prefix: "ECA", flo: "FLO-40327", coach: "Yao N'Dri", villages: ["Divo", "Hiré", "Zégo"] },
  { name: "CAYAT", prefix: "CAY", flo: "FLO-19064", coach: "Mariam Traoré", villages: ["Duekoué", "Guézon", "Bangolo"] },
];
const FIRST = ["Kouadio", "Adjoua", "Konan", "Affoué", "Yao", "Amenan", "Kouamé", "Akissi", "Koffi", "Ahou", "Brou", "Aya", "N'Guessan", "Mariam", "Seydou", "Fatou", "Ibrahim", "Awa"];
const LAST = ["Kone", "N'Guessan", "Kouassi", "Bamba", "Yao", "Traoré", "Ouattara", "Koffi", "Diabaté", "Gnamien", "Tano", "Coulibaly", "Brou", "Kra"];
const SEASONS = [
  { label: "2024/2025", price: 1800, start: "2024-10-15" },
  { label: "2025/2026", price: 2800, start: "2025-10-15" },
];
const CAPTURE = ["consent", "profile", "revenues", "costs", "labour", "expenditures", "results"];
const HARVEST = { oct: 0.2, nov: 0.25, dec: 0.2, jan: 0.1, feb: 0.05, mar: 0.05, may: 0.05, jun: 0.05, jul: 0.05 } as Record<string, number>;

function row(base: TableRow, values: Record<string, string | number>): TableRow {
  return { ...base, ...values };
}

function fill(rec: HouseholdRecord, coop: (typeof COOPS)[number], season: (typeof SEASONS)[number], farmer: { name: string; code: string; village: string; area: number; yieldKgHa: number; family: number }) {
  const m = rec.meta;
  m.areaUnit = "hectare";
  m.volumeUnit = "kg";
  m.currencyUnit = "XOF";
  m.season = season.label;
  m.createdAt = m.updatedAt = new Date(new Date(season.start).getTime() + int(0, 150) * 86400000).toISOString();
  m.completedSteps = rnd() < 0.8 ? CAPTURE.slice() : CAPTURE.slice(0, int(2, 5));

  const c = rec.consent;
  c.respondentName = farmer.name;
  c.date = m.createdAt.slice(0, 10);
  c.releaseFI = true; // all 50 should upload; the consent rule itself is tested separately
  c.releaseCoop = true;
  c.oralConsent = rnd() < 0.3 ? "yes" : "";

  const p = rec.profile;
  Object.assign(p, {
    coopName: coop.name, floId: coop.flo, coachName: coop.coach, programme: "",
    producerName: farmer.name, producerCode: farmer.code, village: farmer.village, gps: "",
  });
  // Yield varies a little season to season.
  const volume = round(farmer.area * farmer.yieldKgHa * between(0.85, 1.15), 10);
  p.cocoaAreaIms = farmer.area;
  p.cocoaAreaImsMeasured = rnd() < 0.7 ? "measured" : "estimated";
  p.cocoaVolumeProduced = volume;
  p.totalFarmAreaIms = round(farmer.area + between(0.5, 3), 0.5);
  p.totalFarmAreaImsMeasured = "estimated";
  p.cocoaVolumeSoldCoop = round(volume * between(0.75, 1), 10);
  p.farmgatePriceMain = season.price;
  p.fpDistributed = round(volume * 0.9 * 70, 1000);
  const base = p.plots[0];
  p.plots = [row(base, { plotNo: 1, crop: "cocoa", area: round(farmer.area * 0.7, 0.1), measured: "measured", landArrangement: "owner_family" })];
  p.plots.push(row(base, { plotNo: 2, crop: "cocoa_intercropped", area: round(farmer.area * 0.3, 0.1), measured: "estimated", landArrangement: pick(["owner_family", "owner_sharecropper", "rented_family"]) }));
  p.fallowLand = round(between(0, 2), 0.5);

  const w = p.householdWorking[0];
  p.householdWorking = [
    row(w, { name: farmer.name, relationship: "head", age: int(32, 62), gender: farmer.name.startsWith("A") || farmer.name.startsWith("M") || farmer.name.startsWith("F") ? "gender_f" : "gender_m", occupation: "fulltime_cocoa", pctTime: 1 }),
    row(w, { name: pick(FIRST) + " " + farmer.name.split(" ")[1], relationship: "spouse", age: int(28, 58), gender: "gender_f", occupation: "parttime_cocoa_other", pctTime: 0.5 }),
  ];
  if (farmer.family > 4) p.householdWorking.push(row(w, { name: pick(FIRST), relationship: "child", age: int(18, 26), gender: pick(["gender_m", "gender_f"]), occupation: "parttime_cocoa", pctTime: 0.3 }));
  const nw = p.householdNotWorking[0];
  p.householdNotWorking = Array.from({ length: Math.max(1, farmer.family - p.householdWorking.length) }, () =>
    row(nw, { name: pick(FIRST), relationship: pick(["child", "child", "grandchild", "parent"]), age: int(3, 17), gender: pick(["gender_m", "gender_f"]), occupation: "student", contributesIncome: "no" })
  );

  // Revenues: cocoa sold month by month at the season's farmgate price.
  const sold = Number(p.cocoaVolumeSoldCoop);
  rec.revenues.cocoaSales = rec.revenues.cocoaSales.map((r) => {
    const share = HARVEST[r.month] ?? 0;
    return share ? { ...r, volume: round(sold * share, 5), price: season.price } : r;
  });
  rec.revenues.cocoaOtherIncome = [row(rec.revenues.cocoaOtherIncome[0], { type: "fp", amount: p.fpDistributed })];
  if (rnd() < 0.5) {
    rec.revenues.has.stapleCrops = true;
    rec.revenues.stapleCrops = [row(rec.revenues.stapleCrops[0], { crop: pick(["cassava", "banana", "yam"]), unit: "kilogram", q1: int(50, 200), q2: int(50, 200), q3: int(20, 100), q4: int(20, 100), qtyConsumed: int(100, 300), qtySold: int(0, 200) })];
  }
  if (rnd() < 0.4) {
    rec.revenues.has.otherFoodCrops = true;
    rec.revenues.otherFoodCrops = [row(rec.revenues.otherFoodCrops[0], { crop: "", totalMarketValue: round(between(40000, 250000), 5000) })];
  }

  // Costs.
  const ai = rec.costs.agriInputs[0];
  rec.costs.agriInputs = [
    row(ai, { productType: "fertilizer", unit: "bag", qty: int(2, 10), totalCost: round(farmer.area * between(30000, 60000), 1000), usedForCocoa: "100" }),
    row(ai, { productType: "pesticides", unit: "litre", qty: int(2, 12), totalCost: round(farmer.area * between(10000, 25000), 500), usedForCocoa: "75_99" }),
  ];
  const tl = rec.costs.tools[0];
  rec.costs.tools = [
    row(tl, { tool: "Machete", lifespan: 2, quantity: int(2, 4), totalCost: 6000 * 3, usedForCocoa: "100" }),
    row(tl, { tool: "Sprayer", lifespan: 5, quantity: 1, totalCost: round(between(25000, 45000), 1000), usedForCocoa: "100" }),
  ];
  rec.costs.otherCosts = [row(rec.costs.otherCosts[0], { costType: "transport", details: "Beans to the coop", totalCost: round(sold * 10, 500), usedForCocoa: "100" })];

  // Labour: hired help for weeding (Jun-Aug) and harvest (Oct-Dec).
  const wage = round(between(2000, 3000), 500);
  rec.labour = rec.labour.map((r) => {
    const harvest = ["oct", "nov", "dec"].includes(r.month);
    const weeding = ["jun", "jul", "aug"].includes(r.month);
    const hh = harvest ? int(15, 25) : weeding ? int(8, 15) : int(2, 6);
    const hired = harvest ? int(4, 12) : weeding ? int(3, 10) : 0;
    return { ...r, hhDays: hh, hhDaysCocoa: round(hh * 0.8, 1), hiredDays: hired, hiredDaysCocoa: hired, dailyWage: hired ? wage : "" };
  });

  // Household spending per quarter.
  const size = farmer.family;
  const q = (lo: number, hi: number) => round(between(lo, hi) * size, 5000);
  rec.expenditures = {
    food: { q1: q(25000, 45000), q2: q(25000, 45000), q3: q(30000, 50000), q4: q(25000, 45000) },
    education: { q1: q(5000, 15000), q2: q(0, 5000), q3: q(15000, 30000), q4: q(0, 5000) },
    healthcare: { q1: q(2000, 8000), q2: q(2000, 8000), q3: q(2000, 8000), q4: q(2000, 8000) },
    other: { q1: q(5000, 12000), q2: q(5000, 12000), q3: q(5000, 12000), q4: q(5000, 12000) },
  };

  // About a third of interviews have 1-3 "Doesn't know" answers.
  m.unknownFields = [];
  if (rnd() < 0.33) {
    const candidates = ["profile.totalFarmAreaIms", "profile.fallowLand", "costs.agriInputs.1.totalCost", "costs.tools.1.totalCost", "expenditures.healthcare.q3", "expenditures.other.q4"];
    for (let i = int(1, 3); i > 0; i--) {
      const path = pick(candidates);
      if (m.unknownFields.includes(path)) continue;
      m.unknownFields.push(path);
      const parts = path.split(".");
      let node: any = rec;
      parts.slice(0, -1).forEach((k) => (node = node[k]));
      node[parts[parts.length - 1]] = "";
    }
  }
}

const records: HouseholdRecord[] = [];
const usedCodes = new Set<string>();
for (let i = 0; i < 34; i++) {
  const coop = COOPS[i % COOPS.length];
  let code: string;
  do code = coop.prefix + String(int(100, 899)); while (usedCodes.has(code));
  usedCodes.add(code);
  const farmer = {
    name: `${pick(FIRST)} ${pick(LAST)}`,
    code,
    village: pick(coop.villages),
    area: round(between(1.5, 6), 0.5),
    yieldKgHa: between(350, 650),
    family: int(3, 8),
  };
  const twoSeasons = i < 16;
  const first = emptyRecord();
  fill(first, coop, twoSeasons ? SEASONS[0] : SEASONS[1], farmer);
  records.push(first);
  if (twoSeasons) {
    const second = emptyRecord(first); // same farmerId, like "Start new season"
    fill(second, coop, SEASONS[1], farmer);
    records.push(second);
  }
}

const out = process.argv[2];
writeFileSync(out, JSON.stringify(records, null, 2));

// Sanity check with the app's own calculations.
const r = records.map((x) => calcResults(x));
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`records: ${records.length}, farmers: ${new Set(records.map((x) => x.meta.farmerId)).size}`);
console.log(`seasons: ${[...new Set(records.map((x) => x.meta.season))].join(", ")}; coops: ${[...new Set(records.map((x) => x.profile.coopName))].join(", ")}`);
console.log(`median net farm income: ${Math.round(med(r.map((x) => x.profitFarm)))} XOF; negative: ${r.filter((x) => x.profitFarm < 0).length}`);
console.log(`median cost/kg: ${Math.round(med(r.map((x) => x.costOfProductionPerKg || 0)))}; with "Doesn't know": ${records.filter((x) => x.meta.unknownFields.length).length}`);
