/* storage.js
   Local-only persistence for a whole collection of household records. Each
   coach can capture many households on one device before exporting;
   nothing leaves the device until an export button is used.

   Records are kept as a map (id -> record) under one localStorage key.
   Older versions of this tool stored a single active record under
   STORAGE_KEY_LEGACY_V1 — that gets migrated in automatically the first
   time this loads, so nobody loses a record already sitting on a device. */

const STORAGE_KEY = "cocoa_capture_records_v2";
const STORAGE_KEY_LEGACY_V1 = "cocoa_capture_active_record_v1";

function loadAllRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      Object.values(map).forEach(ensureRevenueFlags);
      return map;
    }
  } catch (e) {
    console.error("Local load failed", e);
  }
  // migrate a pre-existing single-record save, if present
  try {
    const legacyRaw = localStorage.getItem(STORAGE_KEY_LEGACY_V1);
    if (legacyRaw) {
      const legacyRecord = JSON.parse(legacyRaw);
      if (!legacyRecord.meta.id) legacyRecord.meta.id = generateRecordId();
      ensureRevenueFlags(legacyRecord);
      const map = { [legacyRecord.meta.id]: legacyRecord };
      persistAllRecords(map);
      localStorage.removeItem(STORAGE_KEY_LEGACY_V1);
      return map;
    }
  } catch (e) {
    console.error("Legacy migration failed", e);
  }
  return {};
}

function persistAllRecords(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch (e) {
    console.error("Local save failed", e);
    return false;
  }
}

function saveRecordToStorage(recordsMap, record) {
  record.meta.updatedAt = new Date().toISOString();
  recordsMap[record.meta.id] = record;
  return persistAllRecords(recordsMap);
}

function deleteRecordFromStorage(recordsMap, id) {
  delete recordsMap[id];
  return persistAllRecords(recordsMap);
}

/* Wipe every record on this device. Used by "Delete all data", for when a
   round has been exported and the tablet is being handed to the next
   enumerator. Also drops the legacy v1 key so a migration cannot resurrect
   a record the user just asked to remove. */
/* The interface language is a property of this device and the person holding it,
   not of the record being read. A record captured in French opens in whatever
   language the reader chose; only the coded dropdown answers get re-translated,
   and free text stays exactly as it was typed. */
const LANG_KEY = "cocoa_capture_lang";
function loadLangPref() {
  try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
}
function saveLangPref(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode */ }
}

function clearAllRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_LEGACY_V1);
    return true;
  } catch (e) {
    console.error("Local clear failed", e);
    return false;
  }
}

/* Summary rows for the records list screen, most recently updated first. */
function summarizeRecords(recordsMap) {
  return Object.values(recordsMap)
    .map(r => ({
      id: r.meta.id,
      producerName: r.profile.producerName,
      coopName: r.profile.coopName,
      respondentName: r.consent.respondentName,
      floId: r.profile.floId,
      producerCode: r.profile.producerCode,
      village: r.profile.village,
      updatedAt: r.meta.updatedAt,
    }))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function suggestedFileName(record, ext) {
  const producer = (record.profile.producerName || "household").replace(/[^a-z0-9]+/gi, "_");
  const coop = (record.profile.coopName || "coop").replace(/[^a-z0-9]+/gi, "_");
  const date = new Date().toISOString().slice(0, 10);
  return `cocoa_${coop}_${producer}_${date}.${ext}`;
}

function downloadDataUri(filename, mimeType, content) {
  const encoded = encodeURIComponent(content);
  const a = document.createElement("a");
  a.href = `data:${mimeType};charset=utf-8,${encoded}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportJson(record) {
  const content = JSON.stringify(record, null, 2);
  downloadDataUri(suggestedFileName(record, "json"), "application/json", content);
}

function exportAllJson(recordsMap) {
  const all = Object.values(recordsMap);
  const content = JSON.stringify(all, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  downloadDataUri(`cocoa_all_households_${date}.json`, "application/json", content);
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/* One flattened row per household, mirroring the spirit of the workbook's
   own "dataset" tab: every input field plus every calculated result. */
function csvRowForRecord(record) {
  const results = calcResults(record);
  const p = record.profile;
  const c = record.consent;
  const cols = [];
  const push = (label, value) => cols.push([label, value]);

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

function exportCsv(record) {
  const cols = csvRowForRecord(record);
  const header = cols.map(pair => csvEscape(pair[0])).join(",");
  const values = cols.map(pair => csvEscape(pair[1])).join(",");
  const csv = header + "\n" + values + "\n";
  downloadDataUri(suggestedFileName(record, "csv"), "text/csv", csv);
}

/* One consolidated file, one row per household — this is the file meant
   for pasting straight into a master analysis sheet. */
function exportAllCsv(recordsMap) {
  const records = Object.values(recordsMap);
  if (!records.length) return;
  const rowsOfCols = records.map(csvRowForRecord);
  const header = rowsOfCols[0].map(pair => csvEscape(pair[0])).join(",");
  const dataLines = rowsOfCols.map(cols => cols.map(pair => csvEscape(pair[1])).join(","));
  const csv = header + "\n" + dataLines.join("\n") + "\n";
  const date = new Date().toISOString().slice(0, 10);
  downloadDataUri(`cocoa_all_households_${date}.csv`, "text/csv", csv);
}

function importJsonFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      callback(null, parsed);
    } catch (e) {
      callback(e, null);
    }
  };
  reader.onerror = () => callback(reader.error, null);
  reader.readAsText(file);
}
