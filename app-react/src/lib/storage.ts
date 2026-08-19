/* storage.ts
   Local-only persistence for a whole collection of household records, via
   Dexie (IndexedDB) instead of the vanilla app's single localStorage blob.

   Each coach can capture many households on one device before exporting;
   nothing leaves the device until an export button is used. The vanilla
   version (docs/js/storage.js) kept the entire records map as one
   JSON string under one localStorage key, rewritten in full on every save —
   simple, but capped around 5-10MB (tighter on iOS Safari) and re-serializing
   every household on every keystroke's blur. Dexie gives each household its
   own row instead: writing one record's change no longer touches the others,
   and the practical capacity ceiling moves from a few MB to hundreds+. */

import Dexie, { type Table } from "dexie";
import type { HouseholdRecord } from "./dataModel";
import { ensureRevenueFlags, generateRecordId } from "./dataModel";
import { calcResults } from "./calc";

class CocoaDatabase extends Dexie {
  households!: Table<HouseholdRecord, string>;

  constructor() {
    super("cocoa_capture_db");
    this.version(1).stores({
      // "meta.id" as the primary key keeps the record's own id as the source
      // of truth rather than introducing a second, parallel identifier.
      households: "meta.id, meta.updatedAt",
    });
    // v2 adds meta.farmerId so records from the same farmer across seasons
    // are a real indexed relationship in the DB, not just an in-memory
    // convention. upgrade() backfills any record already on a device: a
    // record with no farmerId yet is a group of one (its own id), same as
    // emptyRecord()'s default for a fresh record.
    this.version(2)
      .stores({
        households: "meta.id, meta.updatedAt, meta.farmerId",
      })
      .upgrade((tx) =>
        tx
          .table("households")
          .toCollection()
          .modify((r: HouseholdRecord) => {
            if (!r.meta.farmerId) r.meta.farmerId = r.meta.id;
            if (r.meta.season == null) r.meta.season = "";
          })
      );
  }
}

export const db = new CocoaDatabase();

// The vanilla app's old localStorage keys — migrated in once, then cleared,
// so a stale key can never resurrect a record after "delete all data".
const OLD_STORAGE_KEY = "cocoa_capture_records_v2";
const OLD_STORAGE_KEY_LEGACY_V1 = "cocoa_capture_active_record_v1";

export async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  const existingCount = await db.households.count();
  if (existingCount > 0) return; // IndexedDB already has data; nothing to migrate

  try {
    const raw = localStorage.getItem(OLD_STORAGE_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, HouseholdRecord>;
      const records = Object.values(map).map(ensureRevenueFlags);
      if (records.length) await db.households.bulkPut(records);
      localStorage.removeItem(OLD_STORAGE_KEY);
      return;
    }
  } catch (e) {
    console.error("Migration from localStorage (v2) failed", e);
  }

  try {
    const legacyRaw = localStorage.getItem(OLD_STORAGE_KEY_LEGACY_V1);
    if (legacyRaw) {
      const legacyRecord = JSON.parse(legacyRaw) as HouseholdRecord;
      if (!legacyRecord.meta.id) legacyRecord.meta.id = generateRecordId();
      ensureRevenueFlags(legacyRecord);
      await db.households.put(legacyRecord);
      localStorage.removeItem(OLD_STORAGE_KEY_LEGACY_V1);
    }
  } catch (e) {
    console.error("Migration from localStorage (legacy v1) failed", e);
  }
}

export async function loadAllRecords(): Promise<Record<string, HouseholdRecord>> {
  await migrateFromLocalStorageIfNeeded();
  const all = await db.households.toArray();
  const map: Record<string, HouseholdRecord> = {};
  all.forEach((r) => {
    ensureRevenueFlags(r);
    map[r.meta.id] = r;
  });
  return map;
}

export async function saveRecord(record: HouseholdRecord): Promise<void> {
  record.meta.updatedAt = new Date().toISOString();
  await db.households.put(record);
}

export async function deleteRecord(id: string): Promise<void> {
  await db.households.delete(id);
}

/** Wipe every record on this device. Used by "Delete all data", for when a
 *  round has been exported and the tablet is being handed to the next
 *  enumerator. Also drops the old localStorage keys so a migration can never
 *  resurrect a record the user just asked to remove. */
export async function clearAllRecords(): Promise<void> {
  await db.households.clear();
  try {
    localStorage.removeItem(OLD_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY_LEGACY_V1);
  } catch {
    /* ignore */
  }
}

/** Every parsed record gets a fresh id on import, even if it already had
 *  one — matches the vanilla app's behavior, so importing the same export
 *  twice creates two records rather than silently overwriting. */
export async function importRecords(parsed: unknown): Promise<HouseholdRecord[]> {
  const list = (Array.isArray(parsed) ? parsed : [parsed]) as HouseholdRecord[];
  const imported: HouseholdRecord[] = [];
  list.forEach((r) => {
    if (!r || !r.meta) return;
    ensureRevenueFlags(r);
    r.meta.id = generateRecordId();
    imported.push(r);
  });
  if (imported.length) await db.households.bulkPut(imported);
  return imported;
}

export function parseImportFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/* The interface language is a property of this device and the person holding
   it, not of the record being read. A record captured in French opens in
   whatever language the reader chose; only the coded dropdown answers get
   re-translated, and free text stays exactly as it was typed. This stays in
   localStorage: it's a single small string with no growth risk. */
const LANG_KEY = "cocoa_capture_lang";
export function loadLangPref(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}
export function saveLangPref(lang: string): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* private mode */
  }
}

/** Strips accents so "Kouame" finds "Kouamé", which matters when the name
 *  on the tablet keyboard rarely matches the name in the record exactly. */
export function normalizeSearch(v: unknown): string {
  return String(v == null ? "" : v)
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim();
}

export function recordMatchesSearch(summary: RecordSummary, needle: string): boolean {
  if (!needle) return true;
  const haystack = normalizeSearch(
    [summary.producerName, summary.coopName, summary.village, summary.floId, summary.producerCode, summary.respondentName].join(" ")
  );
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export interface RecordSummary {
  id: string;
  producerName: string;
  coopName: string;
  respondentName: string;
  floId: string;
  producerCode: string;
  village: string;
  updatedAt: string;
  language: string;
  season: string;
  farmerId: string;
}

/** Summary rows for the records list screen, most recently updated first. */
export function summarizeRecords(recordsMap: Record<string, HouseholdRecord>): RecordSummary[] {
  return Object.values(recordsMap)
    .map((r) => ({
      id: r.meta.id,
      producerName: r.profile.producerName,
      coopName: r.profile.coopName,
      respondentName: r.consent.respondentName,
      floId: r.profile.floId,
      producerCode: r.profile.producerCode,
      village: r.profile.village,
      updatedAt: r.meta.updatedAt,
      language: r.meta.language,
      season: r.meta.season,
      farmerId: r.meta.farmerId,
    }))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function suggestedFileName(record: HouseholdRecord, ext: string): string {
  const producer = (record.profile.producerName || "household").replace(/[^a-z0-9]+/gi, "_");
  const coop = (record.profile.coopName || "coop").replace(/[^a-z0-9]+/gi, "_");
  const date = new Date().toISOString().slice(0, 10);
  return `cocoa_${coop}_${producer}_${date}.${ext}`;
}

function downloadDataUri(filename: string, mimeType: string, content: string): void {
  const encoded = encodeURIComponent(content);
  const a = document.createElement("a");
  a.href = `data:${mimeType};charset=utf-8,${encoded}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportJson(record: HouseholdRecord): void {
  const content = JSON.stringify(record, null, 2);
  downloadDataUri(suggestedFileName(record, "json"), "application/json", content);
}

export function exportAllJson(recordsMap: Record<string, HouseholdRecord>): void {
  const all = Object.values(recordsMap);
  const content = JSON.stringify(all, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  downloadDataUri(`cocoa_all_households_${date}.json`, "application/json", content);
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** One flattened row per household, mirroring the spirit of the workbook's
 *  own "dataset" tab: every input field plus every calculated result. */
function csvRowForRecord(record: HouseholdRecord): [string, unknown][] {
  const results = calcResults(record);
  const p = record.profile;
  const c = record.consent;
  const cols: [string, unknown][] = [];
  const push = (label: string, value: unknown) => cols.push([label, value]);

  push("household_id", record.meta.id);
  push("coop_name", p.coopName);
  push("flo_id", p.floId);
  push("coach_name", p.coachName);
  push("programme", p.programme);
  push("producer_name", p.producerName);
  push("producer_code", p.producerCode);
  push("village", p.village);
  push("gps", p.gps);
  push("area_unit", record.meta.areaUnit);
  push("currency_unit", record.meta.currencyUnit);
  push("cocoa_area_ims", p.cocoaAreaIms);
  push("total_farm_area_ims", p.totalFarmAreaIms);
  push("cocoa_volume_produced_ims", p.cocoaVolumeProduced);
  push("cocoa_volume_sold_coop_ims", p.cocoaVolumeSoldCoop);
  push("farmgate_price_main", p.farmgatePriceMain);
  push("farmgate_price_mid", p.farmgatePriceMid);
  push("fp_distributed", p.fpDistributed);
  push("other_diff_distributed", p.otherDiffDistributed);
  push("total_cocoa_only_area", results.profile.cocoaOnly);
  push("total_intercropped_cocoa_area", results.profile.cocoaIntercropped);
  push("total_cocoa_area", results.profile.totalCocoaArea);
  push("total_cultivated_area", results.profile.totalCultArea);
  push("fallow_land", p.fallowLand);
  push("total_farm_area_farmer", results.profile.totalFarmAreaFarmer);
  push("pct_cocoa_area_sharecropped", results.profile.pctCocoaSharecropped);
  push("pct_farm_area_sharecropped", results.profile.pctFarmSharecropped);
  push("hh_members_working_farm", results.profile.workingCount);
  push("hh_fte_working_farm", results.profile.fte);
  push("hh_total_members", results.profile.totalMembers);
  push("hh_working_age_members", results.profile.workingAge);

  push("total_cocoa_volume_sold_kg", results.revenues.cocoa.totalVolume);
  push("avg_cocoa_price_per_kg", results.revenues.cocoa.avgPrice);
  push("total_cocoa_sales_revenue", results.revenues.cocoa.totalRevenue);
  push("total_other_cocoa_income", results.revenues.cocoaOtherIncome);
  push("total_cocoa_revenue", results.revenues.totalCocoaRevenue);
  push("total_coffee_revenue", results.revenues.totalCoffeeRevenue);
  push("total_other_cash_crop_revenue", results.revenues.otherCashCropRevenue);
  push("total_staple_food_value", results.revenues.stapleValue);
  push("total_other_food_value", results.revenues.otherFoodValue);
  push("total_livestock_value", results.revenues.livestockValue);
  push("total_other_farm_income", results.revenues.otherIncome);
  push("total_farm_revenue", results.totalRevenueFarm);

  push("total_agri_input_cost", results.costs.inputs.total);
  push("total_agri_input_cost_cocoa", results.costs.inputs.totalCocoa);
  push("total_subsidized_input_value", results.costs.inputs.subsidyTotal);
  push("total_tools_cost", results.costs.tools.total);
  push("total_tools_depreciated_cost", results.costs.tools.totalDepreciated);
  push("total_tools_depreciated_cost_cocoa", results.costs.tools.totalDepreciatedCocoa);
  push("total_other_cost", results.costs.other.total);
  push("total_other_cost_cocoa", results.costs.other.totalCocoa);
  push("total_sharecrop_payment_cost", results.costs.sharecrop.total);
  push("total_sharecrop_payment_cost_cocoa", results.costs.sharecrop.totalCocoa);
  push("total_inkind_cocoa_volume_to_sharecroppers", results.costs.sharecrop.inKindCocoaVolume);
  push("total_farm_cost", results.totalCostFarm);
  push("total_cocoa_cost", results.totalCostCocoa);

  push("total_household_labour_days", results.labour.totalHhDays);
  push("total_household_labour_days_cocoa", results.labour.totalHhDaysCocoa);
  push("total_hired_labour_days", results.labour.totalHiredDays);
  push("total_hired_labour_days_cocoa", results.labour.totalHiredDaysCocoa);
  push("avg_daily_wage", results.labour.avgDailyWage);
  push("total_labour_cost", results.labour.totalLabourCost);
  push("total_labour_cost_cocoa", results.labour.totalLabourCostCocoa);
  push("total_subsidized_labour_value", results.labour.subsidizedLabour);

  push("net_farm_income", results.profitFarm);
  push("net_cocoa_income", results.profitCocoa);
  push("cocoa_yield_per_area_unit", results.cocoaYieldPerArea);
  push("cost_of_cocoa_production_per_area_unit", results.costOfProductionPerArea);
  push("cost_of_cocoa_production_per_kg", results.costOfProductionPerKg);
  push("return_on_labour_farm", results.returnOnLabourFarm);
  push("return_on_labour_cocoa", results.returnOnLabourCocoa);

  push("hh_expenditure_food", results.expenditures.food);
  push("hh_expenditure_education", results.expenditures.education);
  push("hh_expenditure_healthcare", results.expenditures.healthcare);
  push("hh_expenditure_other", results.expenditures.other);
  push("hh_expenditure_total", results.expenditures.total);

  push("consent_respondent_name", c.respondentName);
  push("consent_date", c.date);
  push("consent_release_fi", c.releaseFI);
  push("consent_release_coop", c.releaseCoop);
  push("consent_release_pn", c.releasePN);
  push("consent_release_buyers", c.releaseBuyers);
  push("record_updated_at", record.meta.updatedAt);

  return cols;
}

export function exportCsv(record: HouseholdRecord): void {
  const cols = csvRowForRecord(record);
  const header = cols.map((pair) => csvEscape(pair[0])).join(",");
  const values = cols.map((pair) => csvEscape(pair[1])).join(",");
  const csv = header + "\n" + values + "\n";
  downloadDataUri(suggestedFileName(record, "csv"), "text/csv", csv);
}

/** One consolidated file, one row per household — this is the file meant
 *  for pasting straight into a master analysis sheet. */
export function exportAllCsv(recordsMap: Record<string, HouseholdRecord>): void {
  const records = Object.values(recordsMap);
  if (!records.length) return;
  const rowsOfCols = records.map(csvRowForRecord);
  const header = rowsOfCols[0].map((pair) => csvEscape(pair[0])).join(",");
  const dataLines = rowsOfCols.map((cols) => cols.map((pair) => csvEscape(pair[1])).join(","));
  const csv = header + "\n" + dataLines.join("\n") + "\n";
  const date = new Date().toISOString().slice(0, 10);
  downloadDataUri(`cocoa_all_households_${date}.csv`, "text/csv", csv);
}
