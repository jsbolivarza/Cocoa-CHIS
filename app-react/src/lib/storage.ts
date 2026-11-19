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
import { normalizeRecord, generateRecordId } from "./dataModel";
import { calcResults } from "./calc";

/** One cooperative member from an imported roster CSV. producerCode is the
 *  key: it's the identifier the roster exists to standardize. */
export interface RosterEntry {
  producerCode: string;
  producerName: string;
  village: string;
  coopName: string;
}

/** What was last uploaded for a record: its meta.updatedAt at upload time.
 *  A record is pending when its current updatedAt differs. */
export interface SyncLogEntry {
  id: string;
  uploadedUpdatedAt: string;
  uploadedAt: string;
}

/** Small key-value store for the sync session (tokens, signed-in email). */
export interface KvEntry {
  key: string;
  value: unknown;
}

class CocoaDatabase extends Dexie {
  households!: Table<HouseholdRecord, string>;
  roster!: Table<RosterEntry, string>;
  syncLog!: Table<SyncLogEntry, string>;
  kv!: Table<KvEntry, string>;

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
    // v3 adds the producer roster (its own table, replaced wholesale on each
    // import) and backfills meta.unknownFields ("Doesn't know" markers) so
    // every stored record has the list.
    this.version(3)
      .stores({
        households: "meta.id, meta.updatedAt, meta.farmerId",
        roster: "producerCode",
      })
      .upgrade((tx) =>
        tx
          .table("households")
          .toCollection()
          .modify((r: HouseholdRecord) => {
            if (!Array.isArray(r.meta.unknownFields)) r.meta.unknownFields = [];
          })
      );
    // v4: sync bookkeeping (see sync.ts). Kept out of the record itself so
    // uploading never changes a record's updatedAt or its exports.
    this.version(4).stores({
      households: "meta.id, meta.updatedAt, meta.farmerId",
      roster: "producerCode",
      syncLog: "id",
      kv: "key",
    });
  }
}

export const db = new CocoaDatabase();

export async function loadAllRecords(): Promise<Record<string, HouseholdRecord>> {
  const all = await db.households.toArray();
  const map: Record<string, HouseholdRecord> = {};
  all.forEach((r) => {
    normalizeRecord(r);
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
  await db.syncLog.delete(id);
}

/** Wipe every record on this device. Used by "Delete all data", for when a
 *  round has been exported and the tablet is being handed to the next
 *  enumerator — and as the mandatory step before a test device goes into real
 *  field use, since IndexedDB is scoped to the origin, not the path: records
 *  captured while testing /react-preview/ are the same rows the root app will
 *  open after cutover. */
export async function clearAllRecords(): Promise<void> {
  await db.households.clear();
  await db.syncLog.clear();
}

export interface MergeResult {
  /** Records stored on this device by the merge (new or replaced). */
  stored: HouseholdRecord[];
  added: number;
  updated: number;
  /** Same version on both sides. */
  unchanged: number;
  /** This device's copy was saved more recently; kept, uploads later. */
  keptLocal: number;
}

/** Merges records downloaded from the server (see sync.ts). Unlike
 *  importRecords(), ids are KEPT: a server row is the same household as
 *  the local record with that id, so re-uploading updates it instead of
 *  duplicating it. Rule: the most recently saved version wins (compared on
 *  meta.updatedAt). Writes go straight to Dexie, not via saveRecord(),
 *  which would stamp a new updatedAt and make every downloaded record look
 *  freshly edited. Downloaded versions are logged as uploaded, since the
 *  server already has exactly them. */
export async function mergeServerRecords(
  serverRecords: HouseholdRecord[],
  local: Record<string, HouseholdRecord>
): Promise<MergeResult> {
  const result: MergeResult = { stored: [], added: 0, updated: 0, unchanged: 0, keptLocal: 0 };
  serverRecords.forEach((r) => {
    if (!r || !r.meta || !r.meta.id) return;
    normalizeRecord(r);
    const mine = local[r.meta.id];
    const theirs = r.meta.updatedAt || "";
    if (!mine) {
      result.added++;
      result.stored.push(r);
    } else if (theirs > (mine.meta.updatedAt || "")) {
      result.updated++;
      result.stored.push(r);
    } else if (theirs === mine.meta.updatedAt) {
      result.unchanged++;
    } else {
      result.keptLocal++;
    }
  });
  if (result.stored.length) {
    const now = new Date().toISOString();
    await db.transaction("rw", db.households, db.syncLog, async () => {
      await db.households.bulkPut(result.stored);
      await db.syncLog.bulkPut(result.stored.map((r) => ({ id: r.meta.id, uploadedUpdatedAt: r.meta.updatedAt, uploadedAt: now })));
    });
  }
  return result;
}

/** Imports a JSON export. Ids are KEPT, like mergeServerRecords(): until
 *  19.11.26 every import got a fresh id (the vanilla app's behaviour), so
 *  importing the same file twice, or on two devices, and uploading put the
 *  same household on the server twice. Now a record whose id is already on
 *  this device is the same household: the most recently saved version wins,
 *  and an older or identical copy in the file is skipped. Only a record
 *  with no id (very old export) gets a new one. Unlike a download, nothing
 *  is logged as uploaded: the file may hold edits the server never saw. */
export async function importRecords(
  parsed: unknown,
  local: Record<string, HouseholdRecord>
): Promise<MergeResult> {
  const list = (Array.isArray(parsed) ? parsed : [parsed]) as HouseholdRecord[];
  const result: MergeResult = { stored: [], added: 0, updated: 0, unchanged: 0, keptLocal: 0 };
  const seen: Record<string, HouseholdRecord> = { ...local };
  list.forEach((r) => {
    if (!r || !r.meta) return;
    if (!r.meta.id) r.meta.id = generateRecordId();
    // Same backfills as the upgrades above. A file exported before farmerId
    // existed has none, and every such record would otherwise share
    // `undefined` and be grouped as one farmer's seasons.
    if (!r.meta.farmerId) r.meta.farmerId = r.meta.id;
    normalizeRecord(r);
    const mine = seen[r.meta.id];
    const theirs = r.meta.updatedAt || "";
    if (!mine) result.added++;
    else if (theirs > (mine.meta.updatedAt || "")) result.updated++;
    else {
      if (theirs === mine.meta.updatedAt) result.unchanged++;
      else result.keptLocal++;
      return;
    }
    if (mine && result.stored.includes(mine)) result.stored.splice(result.stored.indexOf(mine), 1);
    seen[r.meta.id] = r;
    result.stored.push(r);
  });
  if (result.stored.length) await db.households.bulkPut(result.stored);
  return result;
}

/* Producer roster (see roster.ts for the file format). Stored on this
   device only; each import replaces the whole list, so a coop's updated
   roster never leaves stale codes behind. Records keep whatever code they
   were captured with. */
export async function loadRoster(): Promise<RosterEntry[]> {
  return db.roster.orderBy("producerCode").toArray();
}

export async function replaceRoster(entries: RosterEntry[]): Promise<void> {
  await db.transaction("rw", db.roster, async () => {
    await db.roster.clear();
    await db.roster.bulkPut(entries);
  });
}

export async function clearRoster(): Promise<void> {
  await db.roster.clear();
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
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
function roundTo(value: unknown, decimals: number): unknown {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f;
}

export function csvRowForRecord(record: HouseholdRecord): [string, unknown][] {
  const results = calcResults(record);
  const p = record.profile;
  const c = record.consent;
  const cols: [string, unknown][] = [];
  const push = (label: string, value: unknown) => cols.push([label, value]);
  // Calculated columns are rounded (19.11.26): ratios such as cost per kg
  // or return on labour, and sums of decimal inputs (0.1 + 0.2), otherwise
  // reach the CSV and the server with 12+ decimals. Shares (pct_*, 0-1)
  // keep 4 decimals, everything else 2, the same as the app's own display.
  // Values the coach typed are exported as entered.
  const pushCalc = (label: string, value: unknown) =>
    push(label, roundTo(value, label.startsWith("pct_") ? 4 : 2));

  push("household_id", record.meta.id);
  // farmer_id links one farmer's seasons on this device only; producer_code
  // is the identifier that holds across devices.
  push("farmer_id", record.meta.farmerId);
  push("season", record.meta.season);
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
  pushCalc("total_cocoa_only_area", results.profile.cocoaOnly);
  pushCalc("total_intercropped_cocoa_area", results.profile.cocoaIntercropped);
  pushCalc("total_cocoa_area", results.profile.totalCocoaArea);
  pushCalc("total_cultivated_area", results.profile.totalCultArea);
  push("fallow_land", p.fallowLand);
  pushCalc("total_farm_area_farmer", results.profile.totalFarmAreaFarmer);
  pushCalc("pct_cocoa_area_sharecropped", results.profile.pctCocoaSharecropped);
  pushCalc("pct_farm_area_sharecropped", results.profile.pctFarmSharecropped);
  pushCalc("hh_members_working_farm", results.profile.workingCount);
  pushCalc("hh_fte_working_farm", results.profile.fte);
  pushCalc("hh_total_members", results.profile.totalMembers);
  pushCalc("hh_working_age_members", results.profile.workingAge);

  pushCalc("total_cocoa_volume_sold_kg", results.revenues.cocoa.totalVolume);
  pushCalc("avg_cocoa_price_per_kg", results.revenues.cocoa.avgPrice);
  pushCalc("total_cocoa_sales_revenue", results.revenues.cocoa.totalRevenue);
  pushCalc("total_other_cocoa_income", results.revenues.cocoaOtherIncome);
  pushCalc("total_cocoa_revenue", results.revenues.totalCocoaRevenue);
  pushCalc("total_coffee_revenue", results.revenues.totalCoffeeRevenue);
  pushCalc("total_other_cash_crop_revenue", results.revenues.otherCashCropRevenue);
  pushCalc("total_staple_food_value", results.revenues.stapleValue);
  pushCalc("total_other_food_value", results.revenues.otherFoodValue);
  pushCalc("total_livestock_value", results.revenues.livestockValue);
  pushCalc("total_other_farm_income", results.revenues.otherIncome);
  pushCalc("total_farm_revenue", results.totalRevenueFarm);

  pushCalc("total_agri_input_cost", results.costs.inputs.total);
  pushCalc("total_agri_input_cost_cocoa", results.costs.inputs.totalCocoa);
  pushCalc("total_subsidized_input_value", results.costs.inputs.subsidyTotal);
  pushCalc("total_tools_cost", results.costs.tools.total);
  pushCalc("total_tools_depreciated_cost", results.costs.tools.totalDepreciated);
  pushCalc("total_tools_depreciated_cost_cocoa", results.costs.tools.totalDepreciatedCocoa);
  pushCalc("total_other_cost", results.costs.other.total);
  pushCalc("total_other_cost_cocoa", results.costs.other.totalCocoa);
  pushCalc("total_sharecrop_payment_cost", results.costs.sharecrop.total);
  pushCalc("total_sharecrop_payment_cost_cocoa", results.costs.sharecrop.totalCocoa);
  pushCalc("total_inkind_cocoa_volume_to_sharecroppers", results.costs.sharecrop.inKindCocoaVolume);
  pushCalc("total_farm_cost", results.totalCostFarm);
  pushCalc("total_cocoa_cost", results.totalCostCocoa);

  pushCalc("total_household_labour_days", results.labour.totalHhDays);
  pushCalc("total_household_labour_days_cocoa", results.labour.totalHhDaysCocoa);
  pushCalc("total_hired_labour_days", results.labour.totalHiredDays);
  pushCalc("total_hired_labour_days_cocoa", results.labour.totalHiredDaysCocoa);
  pushCalc("avg_daily_wage", results.labour.avgDailyWage);
  pushCalc("total_labour_cost", results.labour.totalLabourCost);
  pushCalc("total_labour_cost_cocoa", results.labour.totalLabourCostCocoa);
  pushCalc("total_subsidized_labour_value", results.labour.subsidizedLabour);

  pushCalc("net_farm_income", results.profitFarm);
  pushCalc("net_cocoa_income", results.profitCocoa);
  pushCalc("cocoa_yield_per_area_unit", results.cocoaYieldPerArea);
  pushCalc("cost_of_cocoa_production_per_area_unit", results.costOfProductionPerArea);
  pushCalc("cost_of_cocoa_production_per_kg", results.costOfProductionPerKg);
  pushCalc("return_on_labour_farm", results.returnOnLabourFarm);
  pushCalc("return_on_labour_cocoa", results.returnOnLabourCocoa);

  pushCalc("hh_expenditure_food", results.expenditures.food);
  pushCalc("hh_expenditure_education", results.expenditures.education);
  pushCalc("hh_expenditure_healthcare", results.expenditures.healthcare);
  pushCalc("hh_expenditure_other", results.expenditures.other);
  pushCalc("hh_expenditure_total", results.expenditures.total);

  push("consent_respondent_name", c.respondentName);
  push("consent_date", c.date);
  push("consent_release_fi", c.releaseFI);
  push("consent_release_coop", c.releaseCoop);
  push("consent_release_pn", c.releasePN);
  push("consent_release_buyers", c.releaseBuyers);
  // Fields answered "Doesn't know". Their value columns above are blank and
  // the totals count them as 0, so analysts need this to tell them apart.
  const unknown = record.meta.unknownFields || [];
  push("unknown_field_count", unknown.length);
  push("unknown_fields", unknown.join("; "));
  push("record_updated_at", record.meta.updatedAt);

  return cols;
}

/** The CSV row as an object, column name -> value. This is what sync
 *  uploads as `summary`, so the server's flat view has exactly the CSV
 *  export's columns and the calculated results come from calc.ts, not from
 *  a second implementation in SQL. */
export function flatRowForRecord(record: HouseholdRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  csvRowForRecord(record).forEach(([k, v]) => {
    out[k] = typeof v === "number" && !Number.isFinite(v) ? null : v;
  });
  return out;
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

/* ---------------------------------------------------------------------------
   Device storage diagnostics

   Field devices are phones and tablets that will never be cabled to a laptop
   with DevTools open, so "is the data really on this device?" has to be
   answerable from inside the app — something a coach can read out over the
   phone. Every field is deliberately null/"unsupported"-tolerant: iOS Safari
   in particular implements only part of the Storage API, and a diagnostics
   panel that throws is worse than no panel.
--------------------------------------------------------------------------- */

export type ServiceWorkerState = "active" | "waiting" | "none" | "unsupported";

export interface StorageDiagnostics {
  recordCount: number;
  /** Dexie's current schema version (2 at time of writing). */
  dbVersion: number;
  /** null where navigator.storage.estimate() is unavailable. */
  usageBytes: number | null;
  quotaBytes: number | null;
  /** Whether the browser promised not to evict this origin's data. null = can't tell. */
  persisted: boolean | null;
  serviceWorker: ServiceWorkerState;
  /** Installed to the home screen rather than running in a browser tab. On
   *  iOS this is the difference between data surviving a week of disuse and
   *  Safari evicting it, so it's worth showing even though it isn't storage. */
  installed: boolean;
}

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  const recordCount = await db.households.count();

  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    } catch {
      /* leave null */
    }
  }

  let persisted: boolean | null = null;
  if (navigator.storage?.persisted) {
    try {
      persisted = await navigator.storage.persisted();
    } catch {
      /* leave null */
    }
  }

  let serviceWorker: ServiceWorkerState = "unsupported";
  if ("serviceWorker" in navigator) {
    serviceWorker = "none";
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) serviceWorker = "waiting";
      else if (reg?.active) serviceWorker = "active";
    } catch {
      /* leave "none" */
    }
  }

  return {
    recordCount,
    dbVersion: db.verno,
    usageBytes,
    quotaBytes,
    persisted,
    serviceWorker,
    installed: isInstalled(),
  };
}

/** iOS Safari never shipped display-mode: standalone for home-screen apps and
 *  uses a non-standard navigator.standalone instead, so both are checked. */
function isInstalled(): boolean {
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch {
    /* fall through */
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Ask the browser to exempt this origin from storage eviction. Safari ignores
 *  this entirely (returns false or throws), which is exactly why the panel
 *  reports the result rather than assuming success. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
