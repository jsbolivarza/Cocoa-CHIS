/* dataModel.ts
   Ported from docs/js/data-model.js. Defines the shape of a household record
   and the schema for every repeating table in the tool. UI components read
   these schemas to render generic add/remove-row tables instead of
   hand-coding each one. */

import { OPTIONS, type Lang } from "./i18n";

/** Numeric fields start as "" (untouched) and become a number once typed. */
export type NumStr = number | "";

export type TableRow = Record<string, string | number | boolean>;

export interface TableColumn {
  key: string;
  type: "index" | "select" | "number" | "text";
  labelKey: string;
  optionsKey?: string | null;
  staticOptions?: string[];
  optional?: boolean;
  step?: string;
  min?: number;
  max?: number;
}

export interface TableSchema {
  minRows: number;
  columns: TableColumn[];
}

export function emptyRow(columns: TableColumn[]): TableRow {
  const row: TableRow = {};
  columns.forEach((c) => {
    row[c.key] = "";
  });
  return row;
}

export const TABLE_SCHEMAS: Record<string, TableSchema> = {
  plots: {
    minRows: 1,
    columns: [
      { key: "plotNo", type: "index", labelKey: "col_plot" },
      { key: "crop", type: "select", optionsKey: "crop", labelKey: "col_crop" },
      { key: "otherCropName", type: "select", optionsKey: "other_crop_name", labelKey: "col_other_crop", optional: true },
      { key: "area", type: "number", labelKey: "col_area" },
      { key: "measured", type: "select", optionsKey: null, staticOptions: ["measured", "estimated"], labelKey: "col_measured" },
      { key: "landArrangement", type: "select", optionsKey: "land_management", labelKey: "col_land_arrangement" },
      { key: "observation", type: "select", optionsKey: "observation", labelKey: "col_observation", optional: true },
      { key: "treeAge", type: "text", labelKey: "col_tree_age", optional: true },
    ],
  },
  householdWorking: {
    minRows: 1,
    columns: [
      { key: "idx", type: "index", labelKey: "col_name" },
      { key: "name", type: "text", labelKey: "col_name" },
      { key: "relationship", type: "select", optionsKey: "family_relationship", labelKey: "col_relationship" },
      { key: "age", type: "number", labelKey: "col_age" },
      { key: "gender", type: "select", optionsKey: null, staticOptions: ["gender_m", "gender_f"], labelKey: "col_gender" },
      { key: "occupation", type: "select", optionsKey: "occupation_working", labelKey: "col_occupation" },
      { key: "otherOccupation", type: "text", labelKey: "col_other_occupation", optional: true },
      { key: "pctTime", type: "number", labelKey: "col_pct_time", step: "0.05", min: 0, max: 1 },
    ],
  },
  householdNotWorking: {
    minRows: 1,
    columns: [
      { key: "idx", type: "index", labelKey: "col_name" },
      { key: "name", type: "text", labelKey: "col_name" },
      { key: "relationship", type: "select", optionsKey: "family_relationship", labelKey: "col_relationship" },
      { key: "age", type: "number", labelKey: "col_age" },
      { key: "gender", type: "select", optionsKey: null, staticOptions: ["gender_m", "gender_f"], labelKey: "col_gender" },
      { key: "occupation", type: "select", optionsKey: "occupation_not_working", labelKey: "col_occupation" },
      { key: "contributesIncome", type: "select", optionsKey: null, staticOptions: ["yes", "no"], labelKey: "col_contributes_income" },
    ],
  },
  cocoaOtherIncome: {
    minRows: 1,
    columns: [
      { key: "type", type: "select", optionsKey: "cocoa_other_income_type", labelKey: "col_income_type" },
      { key: "amount", type: "number", labelKey: "col_amount" },
    ],
  },
  coffeeOtherIncome: {
    minRows: 1,
    columns: [
      { key: "type", type: "text", labelKey: "col_income_type" },
      { key: "amount", type: "number", labelKey: "col_amount" },
    ],
  },
  otherCashCrops: {
    minRows: 1,
    columns: [
      { key: "crop", type: "select", optionsKey: "cash_crop", labelKey: "col_product" },
      { key: "unit", type: "select", optionsKey: "unit_measure_cash_crop", labelKey: "col_unit_measure" },
      { key: "q1", type: "number", labelKey: "col_q1", optional: true },
      { key: "q2", type: "number", labelKey: "col_q2", optional: true },
      { key: "q3", type: "number", labelKey: "col_q3", optional: true },
      { key: "q4", type: "number", labelKey: "col_q4", optional: true },
      { key: "totalVolumeSold", type: "number", labelKey: "col_total_volume_sold" },
      { key: "totalRevenueOverride", type: "number", labelKey: "col_total_revenue", optional: true },
    ],
  },
  stapleCrops: {
    minRows: 1,
    columns: [
      { key: "crop", type: "select", optionsKey: "staple_crop", labelKey: "col_product" },
      { key: "unit", type: "select", optionsKey: "unit_measure_staple", labelKey: "col_unit_measure" },
      { key: "q1", type: "number", labelKey: "col_q1" },
      { key: "q2", type: "number", labelKey: "col_q2" },
      { key: "q3", type: "number", labelKey: "col_q3" },
      { key: "q4", type: "number", labelKey: "col_q4" },
      { key: "qtyConsumed", type: "number", labelKey: "col_qty_consumed", optional: true },
      { key: "qtySold", type: "number", labelKey: "col_qty_sold", optional: true },
    ],
  },
  otherFoodCrops: {
    minRows: 1,
    columns: [
      { key: "crop", type: "select", optionsKey: "other_food_crop", labelKey: "col_product" },
      { key: "consumption", type: "select", optionsKey: "household_consumption_level", labelKey: "col_domestic_consumption", optional: true },
      { key: "sales", type: "select", optionsKey: "sales_level", labelKey: "col_sales", optional: true },
      { key: "totalQtyProduced", type: "number", labelKey: "col_total_qty_produced", optional: true },
      { key: "totalMarketValue", type: "number", labelKey: "col_total_est_market_value" },
    ],
  },
  livestock: {
    minRows: 1,
    columns: [
      { key: "product", type: "select", optionsKey: "livestock", labelKey: "col_product" },
      { key: "consumption", type: "select", optionsKey: "household_consumption_level", labelKey: "col_domestic_consumption", optional: true },
      { key: "sales", type: "select", optionsKey: "sales_level", labelKey: "col_sales", optional: true },
      { key: "totalQtyProduced", type: "number", labelKey: "col_total_qty_produced", optional: true },
      { key: "totalMarketValue", type: "number", labelKey: "col_total_est_market_value" },
    ],
  },
  otherIncome: {
    minRows: 1,
    columns: [
      { key: "product", type: "text", labelKey: "col_product" },
      { key: "unitOfSales", type: "text", labelKey: "col_unit_of_sales", optional: true },
      { key: "totalSales", type: "number", labelKey: "col_total_sales", optional: true },
      { key: "avgPrice", type: "number", labelKey: "col_avg_price", optional: true },
      { key: "revenueOverride", type: "number", labelKey: "col_revenue", optional: true },
    ],
  },
  agriInputs: {
    minRows: 1,
    columns: [
      { key: "productType", type: "select", optionsKey: "agri_input_type", labelKey: "col_product_type" },
      { key: "unit", type: "text", labelKey: "col_unit_measure", optional: true },
      { key: "qty", type: "number", labelKey: "col_qty_purchased", optional: true },
      { key: "totalCost", type: "number", labelKey: "col_total_cost" },
      { key: "usedForCocoa", type: "select", optionsKey: "cocoa_share", labelKey: "cost_used_for_cocoa" },
      { key: "subsidyValue", type: "number", labelKey: "col_subsidy_value", optional: true },
    ],
  },
  tools: {
    minRows: 1,
    columns: [
      { key: "tool", type: "text", labelKey: "col_tool" },
      { key: "lifespan", type: "number", labelKey: "col_lifespan" },
      { key: "quantity", type: "number", labelKey: "col_quantity", optional: true },
      { key: "totalCost", type: "number", labelKey: "col_total_cost" },
      { key: "depreciatedCost", type: "number", labelKey: "col_depreciated_cost", optional: true },
      { key: "usedForCocoa", type: "select", optionsKey: "cocoa_share", labelKey: "cost_used_for_cocoa" },
      { key: "subsidyValue", type: "number", labelKey: "col_subsidy_value", optional: true },
    ],
  },
  otherCosts: {
    minRows: 1,
    columns: [
      { key: "costType", type: "select", optionsKey: "other_cost_type", labelKey: "col_cost_type" },
      { key: "details", type: "text", labelKey: "col_details", optional: true },
      { key: "totalCost", type: "number", labelKey: "col_total_cost" },
      { key: "usedForCocoa", type: "select", optionsKey: "cocoa_share", labelKey: "cost_used_for_cocoa" },
      { key: "subsidyValue", type: "number", labelKey: "col_subsidy_value", optional: true },
    ],
  },
  sharecropPayments: {
    minRows: 1,
    columns: [
      { key: "paymentType", type: "select", optionsKey: "sharecrop_payment_type", labelKey: "col_payment_type" },
      { key: "cashOrKind", type: "select", optionsKey: null, staticOptions: ["cash", "in_kind"], labelKey: "col_cash_or_kind" },
      { key: "cocoaVolumeInKind", type: "number", labelKey: "col_cocoa_volume_in_kind", optional: true },
      { key: "costOrValue", type: "number", labelKey: "col_cost_or_value" },
      { key: "cocoaShare", type: "select", optionsKey: "cocoa_share", labelKey: "cost_used_for_cocoa" },
    ],
  },
};

export function makeEmptyTable(schemaKey: string): TableRow[] {
  const schema = TABLE_SCHEMAS[schemaKey];
  const rows: TableRow[] = [];
  for (let i = 0; i < schema.minRows; i++) {
    rows.push(emptyRow(schema.columns));
  }
  return rows;
}

export interface MonthSalesRow extends TableRow {
  month: string;
  volume: NumStr;
  price: NumStr;
}

export interface LabourRow extends TableRow {
  month: string;
  hhDays: NumStr;
  hhDaysCocoa: NumStr;
  hiredDays: NumStr;
  hiredDaysCocoa: NumStr;
  dailyWage: NumStr;
  otherService: string;
  serviceUsedFor: string;
  serviceCost: NumStr;
  subsidizedLabour: NumStr;
}

export function makeEmptyMonthlySales(): MonthSalesRow[] {
  return OPTIONS.months.map((m) => ({ month: m.key, volume: "", price: "" }));
}

export function makeEmptyLabourTable(): LabourRow[] {
  return OPTIONS.months.map((m) => ({
    month: m.key,
    hhDays: "", hhDaysCocoa: "",
    hiredDays: "", hiredDaysCocoa: "",
    dailyWage: "",
    otherService: "", serviceUsedFor: "", serviceCost: "",
    subsidizedLabour: "",
  }));
}

export function generateRecordId(): string {
  return "hh_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export interface RecordMeta {
  id: string;
  formatVersion: number;
  language: Lang;
  createdAt: string;
  updatedAt: string;
  areaUnit: string;
  volumeUnit: string;
  currencyUnit: string;
  /** Steps the enumerator has explicitly marked done. Nothing in this form
   *  is strictly required, so completion cannot be inferred from the data. */
  completedSteps: string[];
  /** Groups every season captured for the same farmer. Equal to this
   *  record's own id until "Start new season" copies an existing farmer's
   *  id onto a new record — never null, so grouping is always a plain
   *  equality filter with no null-handling elsewhere in the app. */
  farmerId: string;
  /** Free-text season label the coach enters (e.g. "2024/2025"); blank
   *  until they set it. Not derived automatically — data entry can happen
   *  well after the season it describes. */
  season: string;
}

export interface ConsentData {
  respondentName: string;
  date: string;
  releaseFI: boolean;
  releaseCoop: boolean;
  releasePN: boolean;
  releaseBuyers: boolean;
  oralConsent: string;
  explanation: string;
}

export interface ProfileData {
  coopName: string;
  floId: string;
  coachName: string;
  programme: string;
  producerName: string;
  producerCode: string;
  village: string;
  gps: string;
  cocoaAreaIms: NumStr;
  cocoaAreaImsMeasured: string;
  cocoaVolumeProduced: NumStr;
  totalFarmAreaIms: NumStr;
  totalFarmAreaImsMeasured: string;
  cocoaVolumeSoldCoop: NumStr;
  farmgatePriceMain: NumStr;
  fpDistributed: NumStr;
  farmgatePriceMid: NumStr;
  otherDiffDistributed: NumStr;
  plots: TableRow[];
  fallowLand: NumStr;
  minorFoodCrops: string;
  livestockKept: string;
  householdWorking: TableRow[];
  householdNotWorking: TableRow[];
}

export interface RevenueFlags {
  coffee: boolean;
  otherCashCrops: boolean;
  stapleCrops: boolean;
  otherFoodCrops: boolean;
  livestock: boolean;
  otherIncome: boolean;
}

export interface RevenuesData {
  has: RevenueFlags;
  cocoaSales: MonthSalesRow[];
  cocoaOtherIncome: TableRow[];
  coffeeSales: MonthSalesRow[];
  coffeeOtherIncome: TableRow[];
  otherCashCrops: TableRow[];
  stapleCrops: TableRow[];
  otherFoodCrops: TableRow[];
  livestock: TableRow[];
  otherIncome: TableRow[];
}

export interface CostsData {
  agriInputs: TableRow[];
  tools: TableRow[];
  otherCosts: TableRow[];
  sharecropPayments: TableRow[];
}

export interface ExpenditureCategory {
  q1: NumStr;
  q2: NumStr;
  q3: NumStr;
  q4: NumStr;
}

export interface ExpendituresData {
  food: ExpenditureCategory;
  education: ExpenditureCategory;
  healthcare: ExpenditureCategory;
  other: ExpenditureCategory;
}

export interface HouseholdRecord {
  meta: RecordMeta;
  consent: ConsentData;
  profile: ProfileData;
  revenues: RevenuesData;
  costs: CostsData;
  labour: LabourRow[];
  expenditures: ExpendituresData;
}

/** `linkTo` starts a new season for a farmer already on this device: the
 *  new record shares `linkTo`'s farmerId (instead of getting its own) and
 *  carries over the profile fields least likely to change season to
 *  season, as an editable starting point. Consent, revenues, costs,
 *  labour, expenditures and the season label itself always start blank —
 *  consent must be reconfirmed, and this season's figures haven't
 *  happened yet. */
export function emptyRecord(linkTo?: HouseholdRecord): HouseholdRecord {
  const id = generateRecordId();
  const p = linkTo?.profile;
  return {
    meta: {
      id,
      formatVersion: 2,
      language: "en",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      areaUnit: linkTo?.meta.areaUnit ?? "acre",
      volumeUnit: linkTo?.meta.volumeUnit ?? "kg",
      currencyUnit: linkTo?.meta.currencyUnit ?? "",
      completedSteps: [],
      farmerId: linkTo?.meta.farmerId ?? id,
      season: "",
    },
    consent: {
      respondentName: "", date: "",
      releaseFI: false, releaseCoop: false, releasePN: false, releaseBuyers: false,
      oralConsent: "", explanation: "",
    },
    profile: {
      coopName: p?.coopName ?? "", floId: p?.floId ?? "", coachName: p?.coachName ?? "", programme: p?.programme ?? "",
      producerName: p?.producerName ?? "", producerCode: p?.producerCode ?? "", village: p?.village ?? "", gps: p?.gps ?? "",
      cocoaAreaIms: "", cocoaAreaImsMeasured: "measured",
      cocoaVolumeProduced: "", totalFarmAreaIms: "", totalFarmAreaImsMeasured: "measured",
      cocoaVolumeSoldCoop: "", farmgatePriceMain: "", fpDistributed: "",
      farmgatePriceMid: "", otherDiffDistributed: "",
      plots: p ? p.plots.map((row) => ({ ...row })) : makeEmptyTable("plots"),
      fallowLand: p?.fallowLand ?? "", minorFoodCrops: p?.minorFoodCrops ?? "", livestockKept: p?.livestockKept ?? "",
      householdWorking: p ? p.householdWorking.map((row) => ({ ...row })) : makeEmptyTable("householdWorking"),
      householdNotWorking: p ? p.householdNotWorking.map((row) => ({ ...row })) : makeEmptyTable("householdNotWorking"),
    },
    revenues: {
      has: {
        coffee: false, otherCashCrops: false, stapleCrops: false,
        otherFoodCrops: false, livestock: false, otherIncome: false,
      },
      cocoaSales: makeEmptyMonthlySales(),
      cocoaOtherIncome: makeEmptyTable("cocoaOtherIncome"),
      coffeeSales: makeEmptyMonthlySales(),
      coffeeOtherIncome: makeEmptyTable("coffeeOtherIncome"),
      otherCashCrops: makeEmptyTable("otherCashCrops"),
      stapleCrops: makeEmptyTable("stapleCrops"),
      otherFoodCrops: makeEmptyTable("otherFoodCrops"),
      livestock: makeEmptyTable("livestock"),
      otherIncome: makeEmptyTable("otherIncome"),
    },
    costs: {
      agriInputs: makeEmptyTable("agriInputs"),
      tools: makeEmptyTable("tools"),
      otherCosts: makeEmptyTable("otherCosts"),
      sharecropPayments: makeEmptyTable("sharecropPayments"),
    },
    labour: makeEmptyLabourTable(),
    expenditures: {
      food: { q1: "", q2: "", q3: "", q4: "" },
      education: { q1: "", q2: "", q3: "", q4: "" },
      healthcare: { q1: "", q2: "", q3: "", q4: "" },
      other: { q1: "", q2: "", q3: "", q4: "" },
    },
  };
}

/** The six non-cocoa revenue sections on tab 2, each gated by a yes/no answer.
 *  Ordered as they appear on screen. `arrays` lists every table the answer
 *  controls, so one answer can gate more than one table (coffee has two). */
export const REVENUE_SECTIONS: { key: keyof RevenueFlags; labelKey: string; arrays: (keyof RevenuesData)[] }[] = [
  { key: "coffee", labelKey: "has_coffee", arrays: ["coffeeSales", "coffeeOtherIncome"] },
  { key: "otherCashCrops", labelKey: "has_other_cash_crops", arrays: ["otherCashCrops"] },
  { key: "stapleCrops", labelKey: "has_staple_crops", arrays: ["stapleCrops"] },
  { key: "otherFoodCrops", labelKey: "has_other_food_crops", arrays: ["otherFoodCrops"] },
  { key: "livestock", labelKey: "has_livestock", arrays: ["livestock"] },
  { key: "otherIncome", labelKey: "has_other_income", arrays: ["otherIncome"] },
];

/** True if any cell in any row of this table has been filled in. */
export function tableHasData(rows: unknown): boolean {
  if (!Array.isArray(rows)) return false;
  return rows.some((row: TableRow) =>
    Object.keys(row).some((k) => k !== "month" && row[k] !== "" && row[k] != null && row[k] !== false)
  );
}

/** Records captured before the yes/no answers existed, and records arriving
 *  by JSON import, have no `has` block. Defaulting those to false would hide
 *  data that is already there and silently drop it out of every total, so
 *  the answer is inferred from whether the tables actually contain anything. */
type LooseRevenues = Omit<RevenuesData, "has"> & { has: Partial<RevenueFlags> };

export function ensureRevenueFlags(record: HouseholdRecord): HouseholdRecord {
  if (!record || !record.revenues) return record;
  const rev = record.revenues as unknown as LooseRevenues;
  if (!rev.has) rev.has = {};
  REVENUE_SECTIONS.forEach((section) => {
    if (typeof rev.has[section.key] !== "boolean") {
      rev.has[section.key] = section.arrays.some((name) => tableHasData(rev[name]));
    }
  });
  return record;
}
