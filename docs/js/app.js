/* app.js
   UI rendering and event wiring. Re-renders the active tab's HTML on every
   committed change (blur / select / row add-remove) rather than tracking
   fine-grained DOM patches — simpler and safe for tablets, since the
   "change" event only fires on commit, not per keystroke, so there is no
   focus loss while typing. */

let record = null;
let currentTab = "consent";
let currentLang = "en";
let saveTimer = null;

const TABS = ["consent", "profile", "revenues", "costs", "labour", "expenditures", "results"];
const TAB_LABEL_KEY = {
  consent: "tab_consent", profile: "tab_profile", revenues: "tab_revenues",
  costs: "tab_costs", labour: "tab_labour", expenditures: "tab_expenditures", results: "tab_results",
};
const FIXED_SIZE_TABLES = [];

/* ---------- generic helpers ---------- */
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}
function fmt(n) {
  if (n == null || isNaN(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- field / table rendering ---------- */
function renderInput(path, type, value, opts) {
  opts = opts || {};
  const step = opts.step || "any";
  if (type === "number") {
    return `<input type="number" inputmode="decimal" step="${step}" class="field field-num" data-path="${path}" data-type="number" value="${value === "" || value == null ? "" : esc(value)}">`;
  }
  return `<input type="text" class="field" data-path="${path}" data-type="text" value="${esc(value)}">`;
}

function renderSelect(path, listKey, staticOptions, value, lang) {
  let options;
  if (staticOptions) {
    options = staticOptions.map(k => ({ key: k, label: t(k, lang) }));
  } else {
    options = opt(listKey, lang);
  }
  const optHtml = options.map(o => `<option value="${esc(o.key)}" ${o.key === value ? "selected" : ""}>${esc(o.label)}</option>`).join("");
  return `<select class="field field-select" data-path="${path}" data-type="text"><option value="">${esc(t("select_placeholder", lang))}</option>${optHtml}</select>`;
}

function renderColField(basePath, col, rowVal, lang) {
  const path = `${basePath}.${col.key}`;
  const v = rowVal[col.key];
  if (col.type === "index") return "";
  if (col.type === "select") return renderSelect(path, col.optionsKey, col.staticOptions, v, lang);
  if (col.type === "number") return renderInput(path, "number", v, { step: col.step });
  return renderInput(path, "text", v);
}

function tableHeaderCell(col, lang) {
  if (col.type === "index") return `<th class="col-idx"></th>`;
  const label = t(col.labelKey, lang);
  const optTag = col.optional ? ` <span class="opt-badge">${esc(t("optional_badge", lang))}</span>` : "";
  return `<th>${esc(label)}${optTag}</th>`;
}

function renderTable(schemaKey, arrPath, lang, opts) {
  opts = opts || {};
  const schema = TABLE_SCHEMAS[schemaKey];
  const rows = getPath(record, arrPath) || [];
  const fixed = FIXED_SIZE_TABLES.includes(schemaKey);
  const headerCells = schema.columns.map(c => tableHeaderCell(c, lang)).join("");
  const extraHeader = fixed ? "" : `<th class="col-remove"></th>`;
  const bodyRows = rows.map((row, idx) => {
    const cells = schema.columns.map(col => {
      if (col.type === "index") return `<td class="idx-cell">${idx + 1}</td>`;
      return `<td>${renderColField(`${arrPath}.${idx}`, col, row, lang)}</td>`;
    }).join("");
    const removeCell = fixed ? "" : `<td class="col-remove"><button type="button" class="btn-icon" data-action="remove-row" data-arrpath="${arrPath}" data-idx="${idx}" title="${esc(t("btn_remove_row", lang))}">✕</button></td>`;
    return `<tr>${cells}${removeCell}</tr>`;
  }).join("");
  const addRowBtn = fixed ? "" : `<div class="table-actions"><button type="button" class="btn btn-secondary" data-action="add-row" data-schema="${schemaKey}" data-arrpath="${arrPath}">+ ${esc(t("btn_add_row", lang))}</button></div>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headerCells}${extraHeader}</tr></thead><tbody>${bodyRows}</tbody></table></div>${addRowBtn}`;
}

function doAddRow(schemaKey, arrPath) {
  const schema = TABLE_SCHEMAS[schemaKey];
  const arr = getPath(record, arrPath);
  arr.push(emptyRow(schema.columns));
  scheduleSave();
  renderCurrentTab();
}
function doRemoveRow(arrPath, idx) {
  showConfirmModal(t("confirm_remove_row", currentLang), () => {
    const arr = getPath(record, arrPath);
    arr.splice(idx, 1);
    scheduleSave();
    renderCurrentTab();
  });
}

/* ---------- in-page confirmation dialog ----------
   window.confirm() is unreliable in WKWebView-based iOS browsers (Edge,
   Chrome, Firefox all run on it, not their real engines) especially for
   pages opened from a local file — the dialog can silently never appear,
   which makes the action look like it does nothing. This renders the same
   confirmation as plain HTML instead, so it works the same everywhere. */
function showConfirmModal(message, onConfirm) {
  const overlay = document.getElementById("confirm-modal");
  const okBtn = document.getElementById("confirm-modal-ok");
  const cancelBtn = document.getElementById("confirm-modal-cancel");
  document.getElementById("confirm-modal-message").textContent = message;
  okBtn.textContent = t("btn_delete_record", currentLang);
  cancelBtn.textContent = t("btn_cancel", currentLang);
  overlay.style.display = "flex";

  function cleanup() {
    overlay.style.display = "none";
    okBtn.removeEventListener("click", onOk);
    cancelBtn.removeEventListener("click", onCancel);
    overlay.removeEventListener("click", onOverlayClick);
  }
  function onOk() { cleanup(); onConfirm(); }
  function onCancel() { cleanup(); }
  function onOverlayClick(e) { if (e.target === overlay) onCancel(); }

  okBtn.addEventListener("click", onOk);
  cancelBtn.addEventListener("click", onCancel);
  overlay.addEventListener("click", onOverlayClick);
}
function sectionHeader(headingKey, helpKey, lang) {
  const help = helpKey ? `<p class="section-help">${esc(t(helpKey, lang))}</p>` : "";
  return `<h3>${esc(t(headingKey, lang))}</h3>${help}`;
}
function statBox(labelKey, value, lang, unit) {
  const negative = (typeof value === "number" && isFinite(value) && value < 0) ? " negative" : "";
  return `<div class="stat-box"><div class="stat-label">${esc(t(labelKey, lang))}</div><div class="stat-value${negative}">${fmt(value)}${unit ? " " + esc(unit) : ""}</div></div>`;
}
/* An emphasized card, for the two or three figures a reader looks for first.
   Everything else belongs in a statBox strip: if every number gets a card,
   none of them reads as more important than the others. */
function kpiCard(accent, labelKey, value, lang, unit) {
  const negative = (typeof value === "number" && isFinite(value) && value < 0) ? " negative" : "";
  return `<div class="kpi-card ${accent}">
    <div class="kpi-label">${esc(t(labelKey, lang))}</div>
    <div class="kpi-value${negative}">${fmt(value)}${unit ? ` <small>${esc(unit)}</small>` : ""}</div>
  </div>`;
}

/* ================= CONSENT TAB ================= */
function renderConsentTab(lang) {
  const c = record.consent;
  const bodyText = t("consent_body", lang).split("\n\n").map(p => `<p>${esc(p)}</p>`).join("");
  return `
  <div class="panel">
    <h2>${esc(t("consent_heading", lang))}</h2>
    <div class="consent-text">${bodyText}</div>
    <hr>
    <h3>${esc(t("consent_title", lang))}</h3>
    <div class="form-grid">
      <label>${esc(t("consent_respondent_name", lang))}
        ${renderInput("consent.respondentName", "text", c.respondentName)}
      </label>
      <label>${esc(t("consent_date", lang))}
        <input type="date" class="field" data-path="consent.date" data-type="text" value="${esc(c.date)}">
      </label>
    </div>
    <p class="section-help">${esc(t("consent_release_to", lang))}</p>
    <div class="checkbox-row">
      <label class="check"><input type="checkbox" class="field" data-path="consent.releaseFI" data-type="checkbox" ${c.releaseFI ? "checked" : ""}> ${esc(t("consent_release_fi", lang))}</label>
      <label class="check"><input type="checkbox" class="field" data-path="consent.releaseCoop" data-type="checkbox" ${c.releaseCoop ? "checked" : ""}> ${esc(t("consent_release_coop", lang))}</label>
      <label class="check"><input type="checkbox" class="field" data-path="consent.releasePN" data-type="checkbox" ${c.releasePN ? "checked" : ""}> ${esc(t("consent_release_pn", lang))}</label>
      <label class="check"><input type="checkbox" class="field" data-path="consent.releaseBuyers" data-type="checkbox" ${c.releaseBuyers ? "checked" : ""}> ${esc(t("consent_release_buyers", lang))}</label>
    </div>
    <div class="form-grid">
      <label>${esc(t("consent_oral", lang))}
        ${renderSelect("consent.oralConsent", null, ["yes", "no"], c.oralConsent, lang)}
      </label>
      <label>${esc(t("consent_explanation", lang))}
        ${renderInput("consent.explanation", "text", c.explanation)}
      </label>
    </div>
    <div class="table-actions"><button type="button" class="btn btn-secondary" onclick="window.print()">${esc(t("btn_print_consent", lang))}</button></div>
  </div>`;
}

/* ================= PROFILE TAB ================= */
function renderProfileTab(lang) {
  const p = record.profile;
  const res = calcProfile(p);
  return `
  <div class="panel">
    ${sectionHeader("profile_ims_heading", "profile_ims_help", lang)}
    <div class="form-grid form-grid-3">
      <label>${esc(t("coop_name", lang))} ${renderInput("profile.coopName", "text", p.coopName)}</label>
      <label>${esc(t("flo_id", lang))} ${renderInput("profile.floId", "text", p.floId)}</label>
      <label>${esc(t("coach_name", lang))} ${renderInput("profile.coachName", "text", p.coachName)}</label>
      <label class="optional">${esc(t("programme", lang))} ${renderInput("profile.programme", "text", p.programme)}<span class="field-hint">${esc(t("programme_help", lang))}</span></label>
      <label>${esc(t("producer_name", lang))} ${renderInput("profile.producerName", "text", p.producerName)}</label>
      <label>${esc(t("producer_code", lang))} ${renderInput("profile.producerCode", "text", p.producerCode)}<span class="field-hint">${esc(t("producer_code_help", lang))}</span></label>
      <label class="optional">${esc(t("village", lang))} ${renderInput("profile.village", "text", p.village)}</label>
      <label class="optional">${esc(t("gps", lang))} ${renderInput("profile.gps", "text", p.gps)}</label>
    </div>
    <div class="form-grid form-grid-3">
      <label>${esc(t("area_unit", lang))} ${renderSelect("meta.areaUnit", "area_units", null, record.meta.areaUnit, lang)}</label>
      <label>${esc(t("volume_unit", lang))} ${renderInput("meta.volumeUnit", "text", record.meta.volumeUnit)}</label>
      <label>${esc(t("currency_unit", lang))} ${renderInput("meta.currencyUnit", "text", record.meta.currencyUnit)}<span class="field-hint">${esc(t("unit_hint", lang))}</span></label>
    </div>
    <div class="form-grid form-grid-3">
      <label>${esc(t("cocoa_area_ims", lang))} ${renderInput("profile.cocoaAreaIms", "number", p.cocoaAreaIms)}</label>
      <label>${esc(t("measured_or_estimated", lang))} ${renderSelect("profile.cocoaAreaImsMeasured", null, ["measured", "estimated"], p.cocoaAreaImsMeasured, lang)}</label>
      <label>${esc(t("cocoa_volume_produced", lang))} ${renderInput("profile.cocoaVolumeProduced", "number", p.cocoaVolumeProduced)}</label>
      <label>${esc(t("total_farm_area_ims", lang))} ${renderInput("profile.totalFarmAreaIms", "number", p.totalFarmAreaIms)}</label>
      <label>${esc(t("measured_or_estimated", lang))} ${renderSelect("profile.totalFarmAreaImsMeasured", null, ["measured", "estimated"], p.totalFarmAreaImsMeasured, lang)}</label>
      <label>${esc(t("cocoa_volume_sold_coop", lang))} ${renderInput("profile.cocoaVolumeSoldCoop", "number", p.cocoaVolumeSoldCoop)}</label>
      <label>${esc(t("farmgate_price_main", lang))} ${renderInput("profile.farmgatePriceMain", "number", p.farmgatePriceMain)}</label>
      <label class="optional">${esc(t("fp_distributed", lang))} ${renderInput("profile.fpDistributed", "number", p.fpDistributed)}</label>
      <label class="optional">${esc(t("farmgate_price_mid", lang))} ${renderInput("profile.farmgatePriceMid", "number", p.farmgatePriceMid)}</label>
      <label class="optional">${esc(t("other_diff_distributed", lang))} ${renderInput("profile.otherDiffDistributed", "number", p.otherDiffDistributed)}</label>
    </div>

    ${sectionHeader("farm_distribution_heading", "farm_distribution_help", lang)}
    <div class="kpi-grid">
      ${kpiCard("night", "total_cocoa_area", res.totalCocoaArea, lang, record.meta.areaUnit)}
      ${kpiCard("eggplant", "total_cult_area", res.totalCultArea, lang, record.meta.areaUnit)}
      ${kpiCard("mint", "total_farm_area_farmer", res.totalFarmAreaFarmer, lang, record.meta.areaUnit)}
    </div>
    <div class="stat-row">
      ${statBox("total_cocoa_only_area", res.cocoaOnly, lang, record.meta.areaUnit)}
      ${statBox("total_intercropped_cocoa_area", res.cocoaIntercropped, lang, record.meta.areaUnit)}
      ${statBox("cocoa_area_sharecropped", res.cocoaAreaSharecropped, lang, record.meta.areaUnit)}
      ${statBox("pct_cocoa_sharecropped", res.pctCocoaSharecropped * 100, lang, "%")}
      ${statBox("farm_sharecropped", res.farmSharecropped, lang, record.meta.areaUnit)}
      ${statBox("pct_farm_sharecropped", res.pctFarmSharecropped * 100, lang, "%")}
    </div>
    ${renderTable("plots", "profile.plots", lang)}
    <div class="form-grid form-grid-3">
      <label class="optional">${esc(t("fallow_land", lang))} ${renderInput("profile.fallowLand", "number", p.fallowLand)}</label>
      <label class="optional">${esc(t("minor_food_crops", lang))} ${renderInput("profile.minorFoodCrops", "text", p.minorFoodCrops)}</label>
      <label class="optional">${esc(t("livestock_kept", lang))} ${renderInput("profile.livestockKept", "text", p.livestockKept)}</label>
    </div>

    ${sectionHeader("hh_composition_heading", null, lang)}
    <div class="stat-row">
      ${statBox("hh_total_members", res.totalMembers, lang)}
      ${statBox("hh_working_age", res.workingAge, lang)}
      ${statBox("hh_working_count", res.workingCount, lang)}
      ${statBox("hh_working_fte", res.fte, lang)}
    </div>
    <p class="field-hint">${esc(t("working_age_hint", lang))}</p>

    <h4>${esc(t("hh_working_heading", lang))}</h4>
    <p class="section-help">${esc(t("hh_working_help", lang))}</p>
    ${renderTable("householdWorking", "profile.householdWorking", lang)}

    <h4>${esc(t("hh_not_working_heading", lang))}</h4>
    ${renderTable("householdNotWorking", "profile.householdNotWorking", lang)}
  </div>`;
}

/* ================= REVENUES TAB ================= */
function renderMonthlySalesTable(arrPath, lang) {
  const rows = getPath(record, arrPath);
  const body = rows.map((row, idx) => {
    const revenue = num(row.volume) * num(row.price);
    return `<tr>
      <td>${esc(optLabel("months", row.month, lang))}</td>
      <td>${renderInput(`${arrPath}.${idx}.volume`, "number", row.volume)}</td>
      <td>${renderInput(`${arrPath}.${idx}.price`, "number", row.price)}</td>
      <td class="computed-cell">${fmt(revenue)}</td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>${esc(t("col_month", lang))}</th><th>${esc(t("col_volume_sold", lang))}</th><th>${esc(t("col_price_per_kilo", lang))}</th><th>${esc(t("col_revenue", lang))}</th></tr></thead>
    <tbody>${body}</tbody></table></div>`;
}

function renderRevenuesTab(lang) {
  const r = record.revenues;
  const res = calcRevenues(r);
  const cur = record.meta.currencyUnit;
  return `
  <div class="panel">
    <div class="kpi-grid">
      ${kpiCard("night", "total_cocoa_revenue", res.totalCocoaRevenue, lang, cur)}
      ${kpiCard("eggplant", "total_cocoa_sales", res.cocoa.totalRevenue, lang, cur)}
      ${kpiCard("mint", "total_other_cocoa_income", res.cocoaOtherIncome, lang, cur)}
    </div>
    <div class="stat-row">
      ${statBox("total_coffee_revenue", res.totalCoffeeRevenue, lang, cur)}
      ${statBox("total_other_cash_crop_revenue", res.otherCashCropRevenue, lang, cur)}
      ${statBox("total_staple_value", res.stapleValue, lang, cur)}
      ${statBox("total_other_food_value", res.otherFoodValue, lang, cur)}
      ${statBox("total_livestock_value", res.livestockValue, lang, cur)}
      ${statBox("total_other_income", res.otherIncome, lang, cur)}
    </div>

    ${sectionHeader("rev_cocoa_heading", "rev_cocoa_help", lang)}
    ${renderMonthlySalesTable("revenues.cocoaSales", lang)}
    <h4>${esc(t("rev_cocoa_other_heading", lang))}</h4>
    <p class="section-help">${esc(t("rev_cocoa_other_help", lang))}</p>
    ${renderTable("cocoaOtherIncome", "revenues.cocoaOtherIncome", lang)}

    ${sectionHeader("rev_coffee_heading", "rev_coffee_help", lang)}
    ${renderMonthlySalesTable("revenues.coffeeSales", lang)}
    <div class="stat-row">
      ${statBox("total_coffee_sales", res.coffee.totalRevenue, lang, cur)}
      ${statBox("total_other_coffee_income", res.coffeeOtherIncome, lang, cur)}
    </div>
    <h4>${esc(t("rev_coffee_other_heading", lang))}</h4>
    ${renderTable("coffeeOtherIncome", "revenues.coffeeOtherIncome", lang)}

    ${sectionHeader("rev_cash_crops_heading", "rev_cash_crops_help", lang)}
    ${renderTable("otherCashCrops", "revenues.otherCashCrops", lang)}

    ${sectionHeader("rev_staple_heading", "rev_staple_help", lang)}
    ${renderTable("stapleCrops", "revenues.stapleCrops", lang)}

    ${sectionHeader("rev_other_food_heading", "rev_other_food_help", lang)}
    ${renderTable("otherFoodCrops", "revenues.otherFoodCrops", lang)}

    ${sectionHeader("rev_livestock_heading", "rev_livestock_help", lang)}
    ${renderTable("livestock", "revenues.livestock", lang)}

    ${sectionHeader("rev_other_income_heading", "rev_other_income_help", lang)}
    ${renderTable("otherIncome", "revenues.otherIncome", lang)}
  </div>`;
}

/* ================= COSTS TAB ================= */
function renderCostsTab(lang) {
  const c = record.costs;
  const res = calcCosts(c);
  const cur = record.meta.currencyUnit;
  return `
  <div class="panel">
    <div class="stat-row">
      ${statBox("total_inputs_cost", res.inputs.total, lang, cur)}
      ${statBox("total_inputs_cost_cocoa", res.inputs.totalCocoa, lang, cur)}
      ${statBox("total_tools_cost", res.tools.total, lang, cur)}
      ${statBox("total_tools_cost_cocoa", res.tools.totalDepreciatedCocoa, lang, cur)}
      ${statBox("total_other_cost", res.other.total, lang, cur)}
      ${statBox("total_other_cost_cocoa", res.other.totalCocoa, lang, cur)}
      ${statBox("total_sharecrop_cost", res.sharecrop.total, lang, cur)}
      ${statBox("total_sharecrop_cost_cocoa", res.sharecrop.totalCocoa, lang, cur)}
      ${statBox("total_inkind_cocoa_volume", res.sharecrop.inKindCocoaVolume, lang, record.meta.volumeUnit)}
    </div>

    ${sectionHeader("cost_inputs_heading", null, lang)}
    <p class="field-hint">${esc(t("cost_used_for_cocoa_help", lang))} ${esc(t("subsidy_help", lang))}</p>
    ${renderTable("agriInputs", "costs.agriInputs", lang)}

    ${sectionHeader("cost_tools_heading", null, lang)}
    <p class="field-hint">${esc(t("col_lifespan_help", lang))}</p>
    ${renderTable("tools", "costs.tools", lang)}

    ${sectionHeader("cost_other_heading", null, lang)}
    ${renderTable("otherCosts", "costs.otherCosts", lang)}

    ${sectionHeader("cost_sharecrop_heading", "cost_sharecrop_help", lang)}
    ${renderTable("sharecropPayments", "costs.sharecropPayments", lang)}
    <p class="field-hint">${esc(t("inkind_cross_check", lang))}</p>
  </div>`;
}

/* ================= LABOUR TAB ================= */
function renderLabourTab(lang) {
  const rows = record.labour;
  const res = calcLabour(rows);
  const body = rows.map((row, idx) => {
    const rowCost = num(row.hiredDays) * num(row.dailyWage) + num(row.serviceCost);
    return `<tr>
      <td class="idx-cell">${esc(optLabel("months", row.month, lang))}</td>
      <td>${renderInput(`labour.${idx}.hhDays`, "number", row.hhDays)}</td>
      <td>${renderInput(`labour.${idx}.hhDaysCocoa`, "number", row.hhDaysCocoa)}</td>
      <td>${renderInput(`labour.${idx}.hiredDays`, "number", row.hiredDays)}</td>
      <td>${renderInput(`labour.${idx}.hiredDaysCocoa`, "number", row.hiredDaysCocoa)}</td>
      <td>${renderInput(`labour.${idx}.dailyWage`, "number", row.dailyWage)}</td>
      <td>${renderSelect(`labour.${idx}.otherService`, "labour_service_type", null, row.otherService, lang)}</td>
      <td>${renderSelect(`labour.${idx}.serviceUsedFor`, null, ["cocoa", "non_cocoa"], row.serviceUsedFor, lang)}</td>
      <td>${renderInput(`labour.${idx}.serviceCost`, "number", row.serviceCost)}</td>
      <td class="computed-cell">${fmt(rowCost)}</td>
      <td>${renderInput(`labour.${idx}.subsidizedLabour`, "number", row.subsidizedLabour)}</td>
    </tr>`;
  }).join("");
  return `
  <div class="panel">
    ${sectionHeader("labour_heading", "labour_help_days", lang)}
    <div class="stat-row">
      ${statBox("labour_total", res.totalLabourCost, lang, record.meta.currencyUnit)}
      ${statBox("labour_cost_cocoa", res.totalLabourCostCocoa, lang, record.meta.currencyUnit)}
      ${statBox("col_daily_wage", res.avgDailyWage, lang, record.meta.currencyUnit)}
      ${statBox("col_subsidized_labour", res.subsidizedLabour, lang, record.meta.currencyUnit)}
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>${esc(t("col_month", lang))}</th>
        <th>${esc(t("col_hh_days", lang))}</th>
        <th>${esc(t("col_hh_days_cocoa", lang))}</th>
        <th>${esc(t("col_hired_days", lang))}</th>
        <th>${esc(t("col_hired_days_cocoa", lang))}</th>
        <th>${esc(t("col_daily_wage", lang))}</th>
        <th>${esc(t("col_other_service", lang))}</th>
        <th>${esc(t("col_service_used_for", lang))}</th>
        <th>${esc(t("col_service_cost", lang))}</th>
        <th>${esc(t("col_labour_cost", lang))}</th>
        <th>${esc(t("col_subsidized_labour", lang))}</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <p class="field-hint">${esc(t("other_service_help", lang))}</p>
  </div>`;
}

/* ================= EXPENDITURES TAB ================= */
function renderExpCategory(catKey, headingKey, lang) {
  const cat = record.expenditures[catKey];
  return `<h4>${esc(t(headingKey, lang))}</h4>
  <div class="form-grid form-grid-4">
    <label>${esc(t("col_q1", lang))} ${renderInput(`expenditures.${catKey}.q1`, "number", cat.q1)}</label>
    <label>${esc(t("col_q2", lang))} ${renderInput(`expenditures.${catKey}.q2`, "number", cat.q2)}</label>
    <label>${esc(t("col_q3", lang))} ${renderInput(`expenditures.${catKey}.q3`, "number", cat.q3)}</label>
    <label>${esc(t("col_q4", lang))} ${renderInput(`expenditures.${catKey}.q4`, "number", cat.q4)}</label>
  </div>`;
}
function renderExpendituresTab(lang) {
  const res = calcExpenditures(record.expenditures);
  const cur = record.meta.currencyUnit;
  return `
  <div class="panel">
    <div class="kpi-grid">
      ${kpiCard("night", "res_total_expenditures", res.total, lang, cur)}
    </div>
    <div class="stat-row">
      ${statBox("exp_food_heading", res.food, lang, cur)}
      ${statBox("exp_education_heading", res.education, lang, cur)}
      ${statBox("exp_healthcare_heading", res.healthcare, lang, cur)}
      ${statBox("exp_other_heading", res.other, lang, cur)}
    </div>
    ${renderExpCategory("food", "exp_food_heading", lang)}
    ${renderExpCategory("education", "exp_education_heading", lang)}
    ${renderExpCategory("healthcare", "exp_healthcare_heading", lang)}
    ${renderExpCategory("other", "exp_other_heading", lang)}
  </div>`;
}

/* ================= RESULTS TAB ================= */
function resultsCells(labelKey, farmVal, cocoaVal, lang, unit) {
  return `<td>${esc(t(labelKey, lang))}</td><td class="num">${farmVal == null ? "" : fmt(farmVal)}</td><td class="num">${cocoaVal == null ? "" : fmt(cocoaVal)}</td><td>${esc(unit || record.meta.currencyUnit)}</td>`;
}
function resultsRow(labelKey, farmVal, cocoaVal, lang, unit) {
  return `<tr>${resultsCells(labelKey, farmVal, cocoaVal, lang, unit)}</tr>`;
}
function resultsTotalRow(labelKey, farmVal, cocoaVal, lang, unit) {
  return `<tr class="total-row">${resultsCells(labelKey, farmVal, cocoaVal, lang, unit)}</tr>`;
}
function renderResultsTab(lang) {
  const res = calcResults(record);
  const cur = record.meta.currencyUnit;
  const area = record.meta.areaUnit;
  const vol = record.meta.volumeUnit;
  // Headline cards: the figures anyone asks for first, so they are not buried
  // in a forty-row table while a farmer is sitting across the table.
  const kpis = `
    <div class="kpi-grid">
      ${kpiCard("night", "res_profit", res.profitFarm, lang, cur)}
      ${kpiCard("eggplant", "res_cost_of_production_kg", res.costOfProductionPerKg, lang, cur + "/" + vol)}
      ${kpiCard("mint", "cmp_price_per_kg", res.revenues.cocoa.avgPrice, lang, cur + "/" + vol)}
    </div>
    <div class="stat-row">
      ${statBox("res_cocoa_yield", res.cocoaYieldPerArea, lang, vol + "/" + area)}
      ${statBox("res_total_revenues", res.totalRevenueFarm, lang, cur)}
      ${statBox("res_total_costs", res.totalCostFarm, lang, cur)}
      ${statBox("cmp_net_cocoa", res.profitCocoa, lang, cur)}
      ${statBox("res_total_expenditures", res.expenditures.total, lang, cur)}
      ${statBox("cmp_gap", res.profitFarm - (res.expenditures.total || 0), lang, cur)}
      ${statBox("res_household_labour", res.labour.totalHhDays, lang, t("days_unit", lang))}
    </div>`;
  return `
  <div class="panel">
    ${sectionHeader("results_heading", "results_help", lang)}
    ${kpis}
    <div class="table-wrap"><table class="data-table results-table">
      <thead><tr><th></th><th>${esc(t("col_whole_farm", lang))}</th><th>${esc(t("col_cocoa_only", lang))}</th><th></th></tr></thead>
      <tbody>
        <tr class="group-row"><td colspan="4">${esc(t("res_revenues", lang))}</td></tr>
        ${resultsRow("res_cocoa_sales", res.revenues.totalCocoaRevenue, res.revenues.totalCocoaRevenue, lang)}
        ${resultsRow("res_coffee_sales", res.revenues.totalCoffeeRevenue, null, lang)}
        ${resultsRow("res_other_crop_sales", res.revenues.otherCashCropRevenue, null, lang)}
        ${resultsRow("res_food_crops", res.revenues.foodCropsTotal, null, lang)}
        ${resultsRow("res_livestock", res.revenues.livestockValue, null, lang)}
        ${resultsRow("res_other_income", res.revenues.otherIncome, null, lang)}
        ${resultsTotalRow("res_total_revenues", res.totalRevenueFarm, res.totalRevenueCocoa, lang)}

        <tr class="group-row"><td colspan="4">${esc(t("res_costs", lang))}</td></tr>
        ${resultsRow("res_agri_inputs", res.costs.inputs.total, res.costs.inputs.totalCocoa, lang)}
        ${resultsRow("res_tools", res.costs.tools.totalDepreciated, res.costs.tools.totalDepreciatedCocoa, lang)}
        ${resultsRow("res_other_costs", res.costs.other.total, res.costs.other.totalCocoa, lang)}
        ${resultsRow("res_land_costs", res.costs.sharecrop.total, res.costs.sharecrop.totalCocoa, lang)}
        ${resultsRow("res_hired_labour", res.labour.totalLabourCost, res.labour.totalLabourCostCocoa, lang)}
        ${resultsTotalRow("res_total_costs", res.totalCostFarm, res.totalCostCocoa, lang)}

        <tr class="group-row"><td colspan="4">${esc(t("res_results", lang))}</td></tr>
        ${resultsTotalRow("res_profit", res.profitFarm, res.profitCocoa, lang)}
        ${resultsRow("res_cocoa_yield", null, res.cocoaYieldPerArea, lang, record.meta.volumeUnit + "/" + record.meta.areaUnit)}
        ${resultsRow("res_cost_of_production_area", null, res.costOfProductionPerArea, lang, record.meta.currencyUnit + "/" + record.meta.areaUnit)}
        ${resultsRow("res_cost_of_production_kg", null, res.costOfProductionPerKg, lang, record.meta.currencyUnit + "/" + record.meta.volumeUnit)}
        ${resultsRow("res_household_labour", res.labour.totalHhDays, res.labour.totalHhDaysCocoa, lang, t("days_unit", lang))}
        ${resultsRow("res_return_on_labour", res.returnOnLabourFarm, res.returnOnLabourCocoa, lang)}

        <tr class="group-row"><td colspan="4">${esc(t("res_household_expenditures", lang))}</td></tr>
        ${resultsRow("exp_food_heading", res.expenditures.food, null, lang)}
        ${resultsRow("exp_education_heading", res.expenditures.education, null, lang)}
        ${resultsRow("exp_healthcare_heading", res.expenditures.healthcare, null, lang)}
        ${resultsRow("exp_other_heading", res.expenditures.other, null, lang)}
        ${resultsTotalRow("res_total_expenditures", res.expenditures.total, null, lang)}
      </tbody>
    </table></div>
  </div>`;
}

/* ---------- shell / navigation ---------- */
const TAB_RENDERERS = {
  consent: renderConsentTab, profile: renderProfileTab, revenues: renderRevenuesTab,
  costs: renderCostsTab, labour: renderLabourTab, expenditures: renderExpendituresTab, results: renderResultsTab,
};

let records = {};        // id -> record, the whole collection on this device
let currentRecordId = null;
let screen = "list";     // "list" (records overview) | "editor" (a single household's tabs)
let listTab = "records"; // "records" | "compare", the two tabs of the list screen
// In memory only. A search that survived a restart would hide records with no
// visible reason why, which reads as data loss on a device that has no backend.
let recordSearch = "";
let compareFilters = { coop: "", programme: "", areaUnit: "", currency: "" };

const LIST_TABS = ["records", "compare"];
const LIST_TAB_LABEL_KEY = { records: "tab_list_records", compare: "tab_list_compare" };

function renderCurrentTab() {
  const container = document.getElementById("tab-content");
  if (screen === "list") {
    renderListNav();
    updateSearchBar();
    container.innerHTML = listTab === "compare"
      ? renderCompareScreen(currentLang)
      : renderRecordsScreen(currentLang);
    if (listTab === "compare") wireCompareFilters();
    return;
  }
  container.innerHTML = TAB_RENDERERS[currentTab](currentLang);
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === currentTab));
}

function switchTab(tab) {
  currentTab = tab;
  renderCurrentTab();
  window.scrollTo(0, 0);
}

function renderNav() {
  const nav = document.getElementById("tab-nav");
  nav.innerHTML = TABS.map(tab => `<button type="button" class="nav-btn ${tab === currentTab ? "active" : ""}" data-tab="${tab}">${esc(t(TAB_LABEL_KEY[tab], currentLang))}</button>`).join("");
}

function renderListNav() {
  const nav = document.getElementById("list-nav");
  nav.innerHTML = LIST_TABS.map(tab =>
    `<button type="button" class="nav-btn ${tab === listTab ? "active" : ""}" data-list-tab="${tab}">${esc(t(LIST_TAB_LABEL_KEY[tab], currentLang))}</button>`).join("");
}

function switchListTab(tab) {
  listTab = tab;
  renderCurrentTab();
  window.scrollTo(0, 0);
}

/* The search box lives in static markup outside #tab-content, so it survives
   re-renders and keeps focus while typing. That means its visibility and its
   labels have to be driven from here rather than from a template string. */
function updateSearchBar() {
  const bar = document.getElementById("record-search-bar");
  const showing = screen === "list" && listTab === "records" && Object.keys(records).length > 0;
  bar.style.display = showing ? "" : "none";
  if (!showing) return;
  document.getElementById("record-search-label").textContent = t("search_label", currentLang);
  const box = document.getElementById("record-search");
  box.placeholder = t("search_placeholder", currentLang);
  const clear = document.getElementById("record-search-clear");
  clear.textContent = t("search_clear", currentLang);
  clear.style.display = recordSearch ? "" : "none";
}

function normalizeSearch(v) {
  // Strip accents so "Kouame" finds "Kouamé", which matters when the name on
  // the tablet keyboard rarely matches the name in the record exactly.
  return String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function recordMatchesSearch(summary, needle) {
  if (!needle) return true;
  const haystack = normalizeSearch(
    [summary.producerName, summary.coopName, summary.village, summary.floId,
     summary.producerCode, summary.respondentName].join(" "));
  return needle.split(/\s+/).every(word => haystack.includes(word));
}

function clearRecordSearch() {
  recordSearch = "";
  const box = document.getElementById("record-search");
  if (box) box.value = "";
  renderCurrentTab();
}

function applyScreenVisibility() {
  document.body.classList.toggle("screen-list", screen === "list");
  document.body.classList.toggle("screen-editor", screen === "editor");
}

/* ---------- records list screen ---------- */
function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch (e) { return iso; }
}

function renderRecordsScreen(lang) {
  const all = summarizeRecords(records);
  const needle = normalizeSearch(recordSearch);
  const list = all.filter(r => recordMatchesSearch(r, needle));
  if (all.length && !list.length) {
    return `
    <div class="panel">
      ${sectionHeader("records_heading", "records_help", lang)}
      <div class="empty-state">${esc(t("search_no_match", lang))}
        <a href="#" data-action="clear-search">${esc(t("search_clear_link", lang))}</a>
      </div>
    </div>`;
  }
  if (!list.length) {
    return `
    <div class="panel records-empty">
      <h2>${esc(t("records_empty_title", lang))}</h2>
      <p class="section-help">${esc(t("records_empty_body", lang))}</p>
      <div class="table-actions"><button type="button" class="btn btn-secondary" data-action="new-record-cta">+ ${esc(t("btn_new_record", lang))}</button></div>
    </div>`;
  }
  const countLabel = needle
    ? `${list.length} ${esc(t("search_showing", lang))} ${all.length} ${esc(t("records_count_suffix", lang))}`
    : `${list.length} ${esc(t("records_count_suffix", lang))}`;
  const rows = list.map(r => `
    <div class="record-card">
      <div class="record-card-main">
        <div class="record-card-title">${esc(r.producerName || t("unnamed_household", lang))}</div>
        <div class="record-card-sub">${esc(r.coopName || t("unnamed_coop", lang))}${r.respondentName ? " · " + esc(r.respondentName) : ""}</div>
        <div class="record-card-date">${esc(t("col_updated", lang))}: ${esc(fmtDate(r.updatedAt))}</div>
      </div>
      <div class="record-card-actions">
        <button type="button" class="btn" data-action="open-record" data-id="${r.id}">${esc(t("btn_open_record", lang))}</button>
        <button type="button" class="btn" data-action="export-json-record" data-id="${r.id}">${esc(t("btn_export_json", lang))}</button>
        <button type="button" class="btn" data-action="export-csv-record" data-id="${r.id}">${esc(t("btn_export_csv", lang))}</button>
        <button type="button" class="btn-icon" data-action="delete-record" data-id="${r.id}" title="${esc(t("btn_delete_record", lang))}">✕</button>
      </div>
    </div>`).join("");
  return `
  <div class="panel">
    ${sectionHeader("records_heading", "records_help", lang)}
    <p class="records-count">${countLabel}</p>
    <div class="records-list">${rows}</div>
  </div>`;
}

/* ---------- comparison screen ----------
   Everything below is read from calc.js, the same engine that fills the
   results tab, so a figure here can never disagree with the figure the
   enumerator saw while capturing. Nothing new is computed except the two
   derived indicators at the bottom of compareSummary. */

/* Currencies are free-typed, so "XOF", "xof" and " XOF " arrive as three
   different values and would each suppress the averages. Only the comparison
   normalises them; what the enumerator typed is never modified. */
function currencyKey(rec) {
  return String(rec.meta.currencyUnit || "").trim().toUpperCase();
}

function compareSummary(rec) {
  const r = calcResults(rec);
  const members = r.profile.totalMembers;
  const price = r.revenues.cocoa.avgPrice;
  const costKg = r.costOfProductionPerKg;
  return {
    id: rec.meta.id,
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
    members: members,
    labourDays: (r.labour.totalHhDaysCocoa || 0) + (r.labour.totalHiredDaysCocoa || 0),
    returnOnLabour: r.returnOnLabourCocoa,
    // Derived: what a kilo actually earns after it has been produced.
    marginPerKg: (price == null || costKg == null) ? null : price - costKg,
    // Derived: whether the farm covered what the household spent.
    gap: r.profitFarm - (r.expenditures.total || 0),
    // Derived: net farm income spread across everyone it has to support.
    perPerson: members > 0 ? r.profitFarm / members : null,
  };
}

function renderCompareScreen(lang) {
  const all = Object.values(records);
  if (all.length < 2) {
    return `<div class="panel">
      ${sectionHeader("compare_heading", "compare_help", lang)}
      <div class="empty-state">${esc(t("compare_need_more", lang))}</div>
    </div>`;
  }

  const summaries = all.map(compareSummary);

  // Filter options come from the records actually on the device, so a dropdown
  // never offers a cooperative or currency nobody captured.
  const uniq = key => [...new Set(summaries.map(s => (s[key] || "").toString().trim()))].filter(Boolean).sort();
  const opts = { coop: uniq("coop"), programme: uniq("programme"), areaUnit: uniq("areaUnit"), currency: uniq("currency") };

  // Drop any filter whose value no longer exists, e.g. after deleting a record.
  Object.keys(compareFilters).forEach(k => {
    if (compareFilters[k] && !opts[k].includes(compareFilters[k])) compareFilters[k] = "";
  });

  const list = summaries.filter(s =>
    (!compareFilters.coop || (s.coop || "").trim() === compareFilters.coop) &&
    (!compareFilters.programme || (s.programme || "").trim() === compareFilters.programme) &&
    (!compareFilters.areaUnit || s.areaUnit === compareFilters.areaUnit) &&
    (!compareFilters.currency || s.currency === compareFilters.currency));

  const hasFilter = Object.values(compareFilters).some(Boolean);
  const sel = (key, labelKey) => `
    <div class="filter-field">
      <label>${esc(t(labelKey, lang))}</label>
      <select class="field field-select" data-compare-filter="${key}">
        <option value="">${esc(t("filter_all", lang))}</option>
        ${opts[key].map(o => `<option value="${esc(o)}" ${o === compareFilters[key] ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>
    </div>`;
  const filterBar = `<div class="filter-bar">
      ${sel("coop", "filter_coop")}
      ${sel("programme", "filter_programme")}
      ${sel("areaUnit", "filter_area_unit")}
      ${sel("currency", "filter_currency")}
      ${hasFilter ? `<button type="button" class="btn" data-compare-reset>${esc(t("filter_reset", lang))}</button>` : ""}
    </div>`;

  if (!list.length) {
    return `<div class="panel">
      ${sectionHeader("compare_heading", "compare_help", lang)}
      ${filterBar}
      <div class="empty-state">${esc(t("compare_no_match", lang))}</div>
    </div>`;
  }

  // Money and per-area figures across different currencies or area units are not
  // the same quantity, so averaging them produces a number that means nothing.
  // Blank those averages rather than hand an enumerator a wrong figure.
  const mixedUnits = new Set(list.map(s => s.currency + "|" + s.areaUnit)).size > 1;

  const avg = pick => {
    const vals = list.map(pick).filter(v => v != null && isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const cell = v => v == null || !isFinite(v) ? "—" : fmt(v);
  const avgCell = (pick, suppressed) => suppressed ? "—" : cell(avg(pick));
  const neg = v => (v != null && isFinite(v) && v < 0) ? " negative" : "";

  const rows = list.map(s => `
    <tr>
      <td class="row-head">${esc(s.producer || t("unnamed_household", lang))}</td>
      <td>${esc(s.coop || "—")}</td>
      <td>${esc((s.currency || "—") + " / " + (s.areaUnit || "—"))}</td>
      <td class="num">${cell(s.cocoaArea)}</td>
      <td class="num">${cell(s.yieldPerArea)}</td>
      <td class="num">${cell(s.costPerKg)}</td>
      <td class="num">${cell(s.pricePerKg)}</td>
      <td class="num${neg(s.marginPerKg)}">${cell(s.marginPerKg)}</td>
      <td class="num${neg(s.netFarm)}">${cell(s.netFarm)}</td>
      <td class="num">${cell(s.expenditure)}</td>
      <td class="num${neg(s.gap)}">${cell(s.gap)}</td>
      <td class="num${neg(s.perPerson)}">${cell(s.perPerson)}</td>
      <td class="num">${cell(s.labourDays)}</td>
    </tr>`).join("");

  const head = [
    "cmp_producer", "cmp_coop", "cmp_units", "cmp_cocoa_area", "cmp_yield",
    "cmp_cost_per_kg", "cmp_price_per_kg", "cmp_margin_per_kg", "cmp_net_farm",
    "cmp_expenditure", "cmp_gap", "cmp_per_person", "cmp_labour_days",
  ].map((k, i) => `<th class="${i >= 3 ? "num" : ""}">${esc(t(k, lang))}</th>`).join("");

  return `<div class="panel">
    ${sectionHeader("compare_heading", "compare_help", lang)}
    ${filterBar}
    ${mixedUnits ? `<p class="warn-note">${esc(t("compare_mixed_currency", lang))}</p>` : ""}
    <div class="table-wrap"><table class="data-table results-table compare-table">
      <thead><tr>${head}</tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td class="row-head">${esc(t("compare_avg", lang))} (${list.length})</td>
          <td></td><td></td>
          <td class="num">${avgCell(s => s.cocoaArea, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.yieldPerArea, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.costPerKg, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.pricePerKg, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.marginPerKg, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.netFarm, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.expenditure, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.gap, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.perPerson, mixedUnits)}</td>
          <td class="num">${avgCell(s => s.labourDays, false)}</td>
        </tr>
      </tbody>
    </table></div>
    <p class="section-help">${esc(t("cmp_gap_help", lang))}</p>
  </div>`;
}

function wireCompareFilters() {
  const container = document.getElementById("tab-content");
  container.querySelectorAll("[data-compare-filter]").forEach(el => {
    el.addEventListener("change", () => {
      compareFilters[el.dataset.compareFilter] = el.value;
      renderCurrentTab();
    });
  });
  const reset = container.querySelector("[data-compare-reset]");
  if (reset) reset.addEventListener("click", () => {
    compareFilters = { coop: "", programme: "", areaUnit: "", currency: "" };
    renderCurrentTab();
  });
}

function goToRecordsList() {
  screen = "list";
  applyScreenVisibility();
  renderCurrentTab();
  window.scrollTo(0, 0);
}

function openRecord(id) {
  if (!records[id]) return;
  currentRecordId = id;
  record = records[id];
  currentLang = record.meta.language || currentLang;
  screen = "editor";
  currentTab = "consent";
  applyScreenVisibility();
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === currentLang));
  renderHeaderStrings();
  renderNav();
  renderCurrentTab();
  window.scrollTo(0, 0);
}

function createNewRecord() {
  const rec = emptyRecord();
  rec.meta.language = currentLang;
  records[rec.meta.id] = rec;
  saveRecordToStorage(records, rec);
  openRecord(rec.meta.id);
}

function deleteRecord(id) {
  showConfirmModal(t("confirm_delete_record", currentLang), () => {
    deleteRecordFromStorage(records, id);
    if (currentRecordId === id) {
      currentRecordId = null;
      record = null;
      screen = "list";
      applyScreenVisibility();
    }
    renderCurrentTab();
  });
}

function deleteAllRecords() {
  if (!Object.keys(records).length) return;
  showConfirmModal(t("confirm_delete_all", currentLang), () => {
    clearAllRecords();
    records = {};
    currentRecordId = null;
    record = null;
    recordSearch = "";
    compareFilters = { coop: "", programme: "", areaUnit: "", currency: "" };
    listTab = "records";
    const box = document.getElementById("record-search");
    if (box) box.value = "";
    screen = "list";
    applyScreenVisibility();
    renderCurrentTab();
  });
}

function renderHeaderStrings() {
  document.getElementById("app-title").textContent = t("app_title", currentLang);
  document.getElementById("app-subtitle").textContent = t("app_subtitle", currentLang);
  document.getElementById("btn-my-records").textContent = t("btn_my_records", currentLang);
  document.getElementById("btn-new-record").textContent = t("btn_new_record", currentLang);
  document.getElementById("btn-export-json").textContent = t("btn_export_json", currentLang);
  document.getElementById("btn-export-csv").textContent = t("btn_export_csv", currentLang);
  document.getElementById("btn-export-all-csv").textContent = t("btn_export_all_csv", currentLang);
  document.getElementById("btn-export-all-json").textContent = t("btn_export_all_json", currentLang);
  document.getElementById("btn-import-json").textContent = t("btn_import_json", currentLang);
  document.getElementById("btn-delete-all").textContent = t("btn_delete_all", currentLang);
  document.getElementById("offline-badge").textContent = t("offline_badge", currentLang);
  document.getElementById("required-hint").textContent = t("required_hint", currentLang);
}

function switchLang(lang) {
  currentLang = lang;
  if (record) record.meta.language = lang;
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  renderNav();
  renderHeaderStrings();
  renderCurrentTab();
  if (record) scheduleSave();
}

/* ---------- save status ---------- */
function setSaveStatus(state) {
  const el = document.getElementById("save-status");
  el.textContent = state === "saving" ? t("btn_saving", currentLang) : t("btn_save", currentLang);
  el.classList.toggle("saving", state === "saving");
}
function scheduleSave() {
  setSaveStatus("saving");
  clearTimeout(saveTimer);
  const target = record;
  saveTimer = setTimeout(() => {
    if (!target || !records[target.meta.id]) return; // record was deleted or closed before this fired
    saveRecordToStorage(records, target);
    setSaveStatus("saved");
  }, 400);
}

/* ---------- event delegation ---------- */
function coerceValue(el) {
  if (el.type === "checkbox") return el.checked;
  if (el.dataset.type === "number") return el.value === "" ? "" : parseFloat(el.value);
  return el.value;
}
function attachHandlers() {
  const container = document.getElementById("tab-content");
  container.addEventListener("change", e => {
    const el = e.target;
    if (el.dataset && el.dataset.path && record) {
      setPath(record, el.dataset.path, coerceValue(el));
      scheduleSave();
      renderCurrentTab();
      // restore scroll not needed: change fires on blur, field no longer focused
    }
  });
  container.addEventListener("click", e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "add-row") doAddRow(btn.dataset.schema, btn.dataset.arrpath);
    else if (action === "remove-row") doRemoveRow(btn.dataset.arrpath, parseInt(btn.dataset.idx, 10));
    else if (action === "open-record") openRecord(btn.dataset.id);
    else if (action === "delete-record") deleteRecord(btn.dataset.id);
    else if (action === "export-json-record") exportJson(records[btn.dataset.id]);
    else if (action === "export-csv-record") exportCsv(records[btn.dataset.id]);
    else if (action === "new-record-cta") createNewRecord();
    else if (action === "clear-search") { e.preventDefault(); clearRecordSearch(); }
  });
}

/* ---------- app lifecycle ---------- */
function initApp() {
  records = loadAllRecords();
  const summary = summarizeRecords(records);
  currentLang = (summary.length && records[summary[0].id].meta.language) || "en";

  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === currentLang));
  screen = "list";
  applyScreenVisibility();
  renderHeaderStrings();
  renderCurrentTab();
  attachHandlers();
  setSaveStatus("saved");

  document.querySelectorAll(".lang-btn").forEach(b => b.addEventListener("click", () => switchLang(b.dataset.lang)));
  document.getElementById("tab-nav").addEventListener("click", e => {
    const btn = e.target.closest(".nav-btn");
    if (btn) switchTab(btn.dataset.tab);
  });
  document.getElementById("list-nav").addEventListener("click", e => {
    const btn = e.target.closest("[data-list-tab]");
    if (btn) switchListTab(btn.dataset.listTab);
  });
  // "input" rather than "change": the list should filter as you type. The box is
  // outside #tab-content so re-rendering the list cannot steal focus from it.
  document.getElementById("record-search").addEventListener("input", e => {
    recordSearch = e.target.value;
    renderCurrentTab();
  });
  document.getElementById("record-search-clear").addEventListener("click", clearRecordSearch);
  document.getElementById("btn-delete-all").addEventListener("click", deleteAllRecords);
  document.getElementById("btn-my-records").addEventListener("click", goToRecordsList);
  document.getElementById("btn-new-record").addEventListener("click", createNewRecord);
  document.getElementById("btn-export-json").addEventListener("click", () => { if (record) exportJson(record); });
  document.getElementById("btn-export-csv").addEventListener("click", () => { if (record) exportCsv(record); });
  document.getElementById("btn-export-all-csv").addEventListener("click", () => exportAllCsv(records));
  document.getElementById("btn-export-all-json").addEventListener("click", () => exportAllJson(records));
  document.getElementById("btn-import-json").addEventListener("click", () => document.getElementById("import-file-input").click());
  document.getElementById("import-file-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    importJsonFile(file, (err, imported) => {
      if (err) { alert("Could not read this file."); return; }
      const list = Array.isArray(imported) ? imported : [imported];
      let lastId = null;
      list.forEach(r => {
        if (!r || !r.meta) return;
        r.meta.id = generateRecordId();
        records[r.meta.id] = r;
        lastId = r.meta.id;
      });
      persistAllRecords(records);
      if (list.length === 1 && lastId) openRecord(lastId);
      else goToRecordsList();
    });
    e.target.value = "";
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", initApp);
