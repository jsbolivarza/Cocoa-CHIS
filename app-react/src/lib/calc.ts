/* calc.ts
   Ported from docs/js/calc.js, unchanged in behavior. Pure calculation
   functions mirroring the formulas found in the original workbook
   (1.profile, 2.revenues, 3.costs, 4.labour, 5.household expenditures,
   6.results). Kept separate from rendering so the logic can be checked
   against the source formulas independently. Every function takes plain
   data and returns plain numbers — no DOM, no side effects. */

import { OPTIONS } from "./i18n";
import type {
  ProfileData, RevenuesData, CostsData, LabourRow, ExpendituresData,
  ExpenditureCategory, HouseholdRecord, MonthSalesRow, TableRow,
} from "./dataModel";

export function num(v: unknown): number {
  const n = parseFloat(v as string);
  return isFinite(n) ? n : 0;
}

function sum<T>(arr: T[], pick: (row: T) => unknown): number {
  return arr.reduce((s, row) => s + num(pick(row)), 0);
}

const COCOA_SHARE_WEIGHT: Record<string, number> = {};
OPTIONS.cocoa_share.forEach((o) => {
  COCOA_SHARE_WEIGHT[o.key] = o.weight ?? 0;
});

/** Weighted cocoa allocation, mirrors the SUMIF-with-wildcards formula used
 *  throughout 3.costs (e.g. E15, H15, E33, E48, E63). */
function cocoaWeightedSum<T>(rows: T[], valuePick: (row: T) => unknown, sharePick: (row: T) => unknown): number {
  return rows.reduce((s, row) => {
    const w = COCOA_SHARE_WEIGHT[sharePick(row) as string] || 0;
    return s + num(valuePick(row)) * w;
  }, 0);
}

/* ---------- 1.profile ---------- */
export function calcProfile(profile: ProfileData) {
  const plots = profile.plots || [];
  const cocoaOnly = sum(plots.filter((p) => p.crop === "cocoa"), (p) => p.area);
  const cocoaIntercropped = sum(plots.filter((p) => p.crop === "cocoa_intercropped"), (p) => p.area);
  const totalCocoaArea = cocoaOnly + cocoaIntercropped;
  const totalCultArea = sum(plots, (p) => p.area);
  const totalFarmAreaFarmer = totalCultArea + num(profile.fallowLand);

  const cocoaAreaSharecropped = sum(
    plots.filter((p) => String(p.landArrangement || "").includes("sharecropper")),
    (p) => (["cocoa", "cocoa_intercropped"].includes(p.crop as string) ? p.area : 0)
  );
  const pctCocoaSharecropped = totalCocoaArea ? cocoaAreaSharecropped / totalCocoaArea : 0;

  const farmSharecropped = sum(plots.filter((p) => String(p.landArrangement || "").includes("sharecropper")), (p) => p.area);
  const pctFarmSharecropped = totalCultArea ? farmSharecropped / totalCultArea : 0;

  const working = profile.householdWorking || [];
  const notWorking = profile.householdNotWorking || [];
  const workingCount = working.filter((r) => r.name).length;
  const fte = sum(working, (r) => r.pctTime);
  const totalMembers = working.filter((r) => r.name).length + notWorking.filter((r) => r.name).length;
  const workingAge = [...working, ...notWorking].filter(
    (r) => r.age !== "" && r.age != null && num(r.age) >= 18 && num(r.age) < 65
  ).length;

  return {
    cocoaOnly, cocoaIntercropped, totalCocoaArea, totalCultArea, totalFarmAreaFarmer,
    cocoaAreaSharecropped, pctCocoaSharecropped, farmSharecropped, pctFarmSharecropped,
    workingCount, fte, totalMembers, workingAge,
  };
}

/* ---------- 2.revenues ---------- */
export function calcMonthlySales(rows: MonthSalesRow[]) {
  const totalVolume = sum(rows, (r) => r.volume);
  const totalRevenue = sum(rows, (r) => num(r.volume) * num(r.price));
  const avgPrice = totalVolume ? totalRevenue / totalVolume : 0;
  return { totalVolume, totalRevenue, avgPrice };
}

function calcOtherIncomeRows(rows: TableRow[]) {
  return sum(rows, (r) => r.amount);
}

function calcCashCropRow(row: TableRow) {
  // revenue = sum of quarters if provided, else use manually entered total
  const quarterSum = num(row.q1) + num(row.q2) + num(row.q3) + num(row.q4);
  const revenue = row.totalRevenueOverride !== "" && row.totalRevenueOverride != null
    ? num(row.totalRevenueOverride)
    : quarterSum;
  const avgPrice = num(row.totalVolumeSold) ? revenue / num(row.totalVolumeSold) : num(row.avgPriceOverride);
  return { revenue, avgPrice };
}

function calcCashCrops(rows: TableRow[]) {
  return sum(rows, (r) => calcCashCropRow(r).revenue);
}

function calcStapleRow(row: TableRow) {
  // total market value entered directly (quarterly production x market price done off-tool by coach)
  return num(row.q1) + num(row.q2) + num(row.q3) + num(row.q4);
}
function calcStapleCrops(rows: TableRow[]) {
  return sum(rows, calcStapleRow);
}

function calcOtherFoodOrLivestock(rows: TableRow[]) {
  return sum(rows, (r) => r.totalMarketValue);
}

function calcOtherFarmIncomeRow(row: TableRow) {
  const revenue = row.revenueOverride !== "" && row.revenueOverride != null
    ? num(row.revenueOverride)
    : num(row.totalSales) * num(row.avgPrice);
  return revenue;
}
function calcOtherFarmIncome(rows: TableRow[]) {
  return sum(rows, (r) => calcOtherFarmIncomeRow(r));
}

/** The six non-cocoa sections are each gated by a yes/no answer on the
 *  revenues tab. "No" means the household does not have that income source,
 *  so the section contributes nothing even if rows were typed and then
 *  switched off. The rows themselves are kept in the record so switching
 *  back restores them. */
export function calcRevenues(revenues: RevenuesData) {
  const has = revenues.has || ({} as RevenuesData["has"]);
  const on = (key: keyof RevenuesData["has"]) => has[key] === true;

  const cocoa = calcMonthlySales(revenues.cocoaSales || []);
  const cocoaOtherIncome = calcOtherIncomeRows(revenues.cocoaOtherIncome || []);
  const totalCocoaRevenue = cocoa.totalRevenue + cocoaOtherIncome;

  const coffee = on("coffee")
    ? calcMonthlySales(revenues.coffeeSales || [])
    : { totalVolume: 0, totalRevenue: 0, avgPrice: null as number | null };
  const coffeeOtherIncome = on("coffee") ? calcOtherIncomeRows(revenues.coffeeOtherIncome || []) : 0;
  const totalCoffeeRevenue = coffee.totalRevenue + coffeeOtherIncome;

  const otherCashCropRevenue = on("otherCashCrops") ? calcCashCrops(revenues.otherCashCrops || []) : 0;
  const stapleValue = on("stapleCrops") ? calcStapleCrops(revenues.stapleCrops || []) : 0;
  const otherFoodValue = on("otherFoodCrops") ? calcOtherFoodOrLivestock(revenues.otherFoodCrops || []) : 0;
  const livestockValue = on("livestock") ? calcOtherFoodOrLivestock(revenues.livestock || []) : 0;
  const otherIncome = on("otherIncome") ? calcOtherFarmIncome(revenues.otherIncome || []) : 0;

  const foodCropsTotal = stapleValue + otherFoodValue;
  const totalFarmRevenue = totalCocoaRevenue + totalCoffeeRevenue + otherCashCropRevenue + foodCropsTotal + livestockValue + otherIncome;

  return {
    cocoa, cocoaOtherIncome, totalCocoaRevenue,
    coffee, coffeeOtherIncome, totalCoffeeRevenue,
    otherCashCropRevenue, stapleValue, otherFoodValue, foodCropsTotal, livestockValue, otherIncome,
    totalFarmRevenue,
  };
}

/* ---------- 3.costs ---------- */
function calcAgriInputs(rows: TableRow[]) {
  const total = sum(rows, (r) => r.totalCost);
  const totalCocoa = cocoaWeightedSum(rows, (r) => r.totalCost, (r) => r.usedForCocoa);
  const subsidyTotal = sum(rows, (r) => r.subsidyValue);
  const subsidyCocoa = cocoaWeightedSum(rows, (r) => r.subsidyValue, (r) => r.usedForCocoa);
  return { total, totalCocoa, subsidyTotal, subsidyCocoa };
}

function calcTools(rows: TableRow[]) {
  // depreciated cost per row = totalCost / lifespan (if not entered directly)
  const withDepr: TableRow[] = rows.map((r) => ({
    ...r,
    depreciatedCost: r.depreciatedCost !== "" && r.depreciatedCost != null
      ? num(r.depreciatedCost)
      : (num(r.lifespan) ? num(r.totalCost) / num(r.lifespan) : num(r.totalCost)),
  }));
  const total = sum(withDepr, (r) => r.totalCost);
  const totalDepreciated = sum(withDepr, (r) => r.depreciatedCost);
  const totalDepreciatedCocoa = cocoaWeightedSum(withDepr, (r) => r.depreciatedCost, (r) => r.usedForCocoa);
  const subsidyTotal = sum(withDepr, (r) => r.subsidyValue);
  const subsidyCocoa = cocoaWeightedSum(withDepr, (r) => r.subsidyValue, (r) => r.usedForCocoa);
  return { total, totalDepreciated, totalDepreciatedCocoa, subsidyTotal, subsidyCocoa, rows: withDepr };
}

function calcOtherCosts(rows: TableRow[]) {
  const total = sum(rows, (r) => r.totalCost);
  const totalCocoa = cocoaWeightedSum(rows, (r) => r.totalCost, (r) => r.usedForCocoa);
  const subsidyTotal = sum(rows, (r) => r.subsidyValue);
  const subsidyCocoa = cocoaWeightedSum(rows, (r) => r.subsidyValue, (r) => r.usedForCocoa);
  return { total, totalCocoa, subsidyTotal, subsidyCocoa };
}

function calcSharecropPayments(rows: TableRow[]) {
  const total = sum(rows, (r) => r.costOrValue);
  const totalCocoa = cocoaWeightedSum(rows, (r) => r.costOrValue, (r) => r.cocoaShare);
  const inKindCocoaVolume = sum(
    rows.filter((r) => r.cashOrKind === "in_kind"),
    (r) => r.cocoaVolumeInKind
  );
  return { total, totalCocoa, inKindCocoaVolume };
}

export function calcCosts(costs: CostsData) {
  const inputs = calcAgriInputs(costs.agriInputs || []);
  const tools = calcTools(costs.tools || []);
  const other = calcOtherCosts(costs.otherCosts || []);
  const sharecrop = calcSharecropPayments(costs.sharecropPayments || []);
  return { inputs, tools, other, sharecrop };
}

/* ---------- 4.labour ---------- */
export function calcLabour(rows: LabourRow[]) {
  const totalHhDays = sum(rows, (r) => r.hhDays);
  const totalHhDaysCocoa = sum(rows, (r) => r.hhDaysCocoa);
  const totalHiredDays = sum(rows, (r) => r.hiredDays);
  const totalHiredDaysCocoa = sum(rows, (r) => r.hiredDaysCocoa);

  const weightedWageNumerator = sum(rows, (r) => num(r.hiredDays) * num(r.dailyWage));
  const avgDailyWage = totalHiredDays ? weightedWageNumerator / totalHiredDays : 0;

  const otherServiceTotal = sum(rows, (r) => r.serviceCost);
  const otherServiceCocoa = sum(rows.filter((r) => r.serviceUsedFor !== "non_cocoa"), (r) => r.serviceCost);

  // per-row labour cost = hiredDays * dailyWage + serviceCost (matches K = E*G + J formulas)
  const rowLabourCost = (r: LabourRow) => num(r.hiredDays) * num(r.dailyWage) + num(r.serviceCost);
  const totalLabourCost = sum(rows, rowLabourCost);

  const hiredCocoaWageCost = sum(rows, (r) => num(r.hiredDaysCocoa) * num(r.dailyWage));
  const totalLabourCostCocoa = hiredCocoaWageCost + otherServiceCocoa;

  const subsidizedLabour = sum(rows, (r) => r.subsidizedLabour);

  return {
    totalHhDays, totalHhDaysCocoa, totalHiredDays, totalHiredDaysCocoa, avgDailyWage,
    otherServiceTotal, otherServiceCocoa, totalLabourCost, totalLabourCostCocoa, subsidizedLabour,
  };
}

/* ---------- 5.household expenditures ---------- */
function calcExpenditureCategory(row: ExpenditureCategory) {
  return num(row.q1) + num(row.q2) + num(row.q3) + num(row.q4);
}
export function calcExpenditures(exp: ExpendituresData) {
  const food = calcExpenditureCategory(exp.food || ({} as ExpenditureCategory));
  const education = calcExpenditureCategory(exp.education || ({} as ExpenditureCategory));
  const healthcare = calcExpenditureCategory(exp.healthcare || ({} as ExpenditureCategory));
  const other = calcExpenditureCategory(exp.other || ({} as ExpenditureCategory));
  return { food, education, healthcare, other, total: food + education + healthcare + other };
}

/* ---------- 6.results ---------- */
export function calcResults(record: HouseholdRecord) {
  const profile = calcProfile(record.profile || ({} as ProfileData));
  const revenues = calcRevenues(record.revenues || ({} as RevenuesData));
  const costs = calcCosts(record.costs || ({} as CostsData));
  const labour = calcLabour(record.labour || []);
  const expenditures = calcExpenditures(record.expenditures || ({} as ExpendituresData));

  const totalRevenueFarm = revenues.totalFarmRevenue;
  const totalRevenueCocoa = revenues.totalCocoaRevenue;

  const totalCostFarm = costs.inputs.total + costs.tools.totalDepreciated + costs.other.total + costs.sharecrop.total + labour.totalLabourCost;
  const totalCostCocoa = costs.inputs.totalCocoa + costs.tools.totalDepreciatedCocoa + costs.other.totalCocoa + costs.sharecrop.totalCocoa + labour.totalLabourCostCocoa;

  const profitFarm = totalRevenueFarm - totalCostFarm;
  const profitCocoa = totalRevenueCocoa - totalCostCocoa;

  // NOTE: the source workbook's own "cocoa yield" (6.results E20) divides by
  // volume sold PLUS in-kind sharecropper payments, but "cost per kg" (E22)
  // divides by volume sold ONLY, without in-kind — an inconsistency in the
  // original file's formulas. Reproduced here exactly rather than "fixed",
  // so this tool's numbers match the workbook's for the same inputs.
  const cocoaVolumeForYield = revenues.cocoa.totalVolume + costs.sharecrop.inKindCocoaVolume;
  const cocoaYieldPerArea = profile.totalCocoaArea ? cocoaVolumeForYield / profile.totalCocoaArea : 0;
  const costOfProductionPerArea = profile.totalCocoaArea ? totalCostCocoa / profile.totalCocoaArea : 0;
  const costOfProductionPerKg = revenues.cocoa.totalVolume ? totalCostCocoa / revenues.cocoa.totalVolume : 0;

  const returnOnLabourFarm = labour.totalHhDays ? profitFarm / labour.totalHhDays : 0;
  const returnOnLabourCocoa = labour.totalHhDaysCocoa ? profitCocoa / labour.totalHhDaysCocoa : 0;

  return {
    profile, revenues, costs, labour, expenditures,
    totalRevenueFarm, totalRevenueCocoa,
    totalCostFarm, totalCostCocoa,
    profitFarm, profitCocoa,
    cocoaVolumeForYield, cocoaYieldPerArea, costOfProductionPerArea, costOfProductionPerKg,
    returnOnLabourFarm, returnOnLabourCocoa,
  };
}
