// v4: native Power BI only (no background image). Every element is ONE visual with its own frame:
// KPI = classic card whose container title is the label and whose subtitle is the live context line.
// Rebuilds only the pages listed; other pages and the semantic model are untouched.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// The Power BI project on the Desktop of whoever runs this (no username in the repo).
const RP = path.join(os.homedir(), "Desktop", "Cocoa prototype dashboard.Report");
const E = "public households_flat";
const C = { navy: "#001B6E", lime: "#D4FF47", grey: "#6B7280", grey7: "#3A4256", line: "#E4E7EC", line2: "#C9CDD6", soft: "#F8F9FB",
  cyan: "#0FC0FC", purple: "#7B1DAB", stone: "#9CA399", mint: "#09C9A8", orange: "#FF8000", pink: "#FF4571", navy5: "#4A63AE",
  limeT: "#F4FBD9", limeB: "#C8E66A", pinkT: "#FFE3EA", pinkD: "#A3123A", limeD: "#4B5B12" };
const W = 1920, M = 32, INNER = W - 2 * M;
const spread = (n, gap, total = INNER, x0 = M) => { const w = Math.floor((total - gap * (n - 1)) / n); return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (w + gap), w })); };

const VSCHEMA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.14.0/schema.json";
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const str = (s) => lit(`'${s.replace(/'/g, "''")}'`);
const color = (c) => ({ solid: { color: lit(`'${c}'`) } });
const src = { SourceRef: { Entity: E } };
const colF = (p) => ({ Column: { Expression: src, Property: p } });
const meaF = (p) => ({ Measure: { Expression: src, Property: p } });
const col = (p, n) => ({ field: colF(p), queryRef: `${E}.${p}`, nativeQueryRef: p, ...(n ? { displayName: n } : {}) });
const mea = (p, n) => ({ field: meaF(p), queryRef: `${E}.${p}`, nativeQueryRef: p, ...(n ? { displayName: n } : {}) });
const pad = (t, r, b, l) => [{ properties: { top: lit(`${t}D`), right: lit(`${r}D`), bottom: lit(`${b}D`), left: lit(`${l}D`) } }];
const frame = (bg, border, radius = 16, shadow = true) => ({
  background: [{ properties: { show: lit("true"), color: color(bg), transparency: lit("0D") } }],
  border: [{ properties: { show: lit("true"), color: color(border), radius: lit(`${radius}D`) } }],
  dropShadow: [{ properties: { show: lit(shadow ? "true" : "false") } }],
});
const title = (text, { size = 13, c = C.navy, align = "left", bold = true } = {}) => [{ properties: {
  show: lit("true"), text: str(text), fontColor: color(c), fontSize: lit(`${size}D`), alignment: str(align),
  fontFamily: str(bold ? "Segoe UI Semibold" : "Segoe UI") } }];

function Page(name, displayName) {
  const visuals = []; let z = 0, seq = 0;
  const add = (prefix, x, y, w, h, visual) => { z++; visuals.push({ $schema: VSCHEMA, name: `${prefix}${String(++seq).padStart(3, "0")}`,
    position: { x, y, width: w, height: h, z: z * 1000, tabOrder: z * 1000 }, visual }); };
  return {
    name, displayName, visuals, add,
    header(t, sub, eyebrow) {
      add("hdr", 0, 0, W, 104, { visualType: "textbox",
        objects: { general: [{ properties: { paragraphs: [
          { textRuns: [{ value: t, textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "24pt", color: "#FFFFFF" } }] },
          { textRuns: [{ value: sub, textStyle: { fontFamily: "Segoe UI", fontSize: "11pt", color: "#C9D2EE" } }] }] } }] },
        visualContainerObjects: { title: [{ properties: { show: lit("false") } }], ...frame(C.navy, C.navy, 0, false), padding: pad(14, 32, 8, M) } });
      add("eyb", W - M - 320, 26, 320, 36, { visualType: "textbox",
        objects: { general: [{ properties: { paragraphs: [{ textRuns: [{ value: eyebrow.toUpperCase(), textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "10pt", color: C.lime } }], horizontalTextAlignment: "right" }] } }] },
        visualContainerObjects: { title: [{ properties: { show: lit("false") } }], background: [{ properties: { show: lit("false") } }], border: [{ properties: { show: lit("false") } }], dropShadow: [{ properties: { show: lit("false") } }] } });
    },
    pills(note) {
      [["season", "Season", false], ["coop_name", "Cooperative", false], ["currency_unit", "Currency · pick one", true], ["area_unit", "Area unit · pick one", true]]
        .forEach(([field, label, single], i) => add("pill", M + i * 296, 118, 280, 72, {
          visualType: "slicer",
          query: { queryState: { Values: { projections: [col(field, label)] } } },
          objects: {
            data: [{ properties: { mode: str("Dropdown") } }],
            selection: [{ properties: { strictSingleSelect: lit(single ? "true" : "false"), selectAllCheckboxEnabled: lit(single ? "false" : "true") } }],
            header: [{ properties: { show: lit("true"), text: str(label.toUpperCase()), fontColor: color(C.grey), textSize: lit("8D"), fontFamily: str("Segoe UI Semibold") } }],
            items: [{ properties: { fontColor: color(C.navy), textSize: lit("11D") } }],
          },
          syncGroup: { groupName: field, fieldChanges: true, filterChanges: true },
          visualContainerObjects: { title: [{ properties: { show: lit("false") } }], ...frame(C.soft, C.line2, 36, false), padding: pad(6, 24, 6, 24) },
          drillFilterOtherVisuals: true,
        }));
      if (note) add("note", M + 4 * 296, 136, INNER - 4 * 296, 40, { visualType: "textbox",
        objects: { general: [{ properties: { paragraphs: [{ textRuns: [{ value: note, textStyle: { fontFamily: "Segoe UI", fontSize: "10pt", color: C.purple } }], horizontalTextAlignment: "right" }] } }] },
        visualContainerObjects: { title: [{ properties: { show: lit("false") } }], background: [{ properties: { show: lit("false") } }], border: [{ properties: { show: lit("false") } }], dropShadow: [{ properties: { show: lit("false") } }] } });
    },
    // One visual per KPI: label = title, context line = live subtitle, value = card.
    kpi(x, y, w, h, label, measure, ctx, tone = "plain", pt = 24) {
      const [bg, bd, lab] = tone === "alert" ? [C.pinkT, C.pink, C.pinkD] : tone === "accent" ? [C.limeT, C.limeB, C.limeD] : [C.soft, C.line, C.grey];
      add("kpi", x, y, w, h, {
        visualType: "card",
        query: { queryState: { Values: { projections: [mea(measure, label)] } } },
        objects: { labels: [{ properties: { color: color(C.navy), fontSize: lit(`${pt}D`), fontFamily: str("Segoe UI Semibold"), labelDisplayUnits: lit("1D") } }],
          categoryLabels: [{ properties: { show: lit("false") } }] },
        visualContainerObjects: {
          title: title(label, { size: 11, c: lab, align: "center", bold: false }),
          ...(ctx ? { subTitle: [{ properties: { show: lit("true"), text: { expr: meaF(ctx) }, fontColor: color(C.grey7), fontSize: lit("9D"), alignment: str("center") } }] } : {}),
          ...frame(bg, bd, 16, false), padding: pad(10, 8, 6, 8),
        },
        drillFilterOtherVisuals: true,
      });
    },
    panel(x, y, w, h, t, visual) {
      add("pnl", x, y, w, h, { ...visual, visualContainerObjects: { title: title(t, { size: 14 }), ...frame("#FFFFFF", C.line, 16, true), padding: pad(12, 16, 12, 16) }, drillFilterOtherVisuals: true });
    },
    footnote(t) {
      add("fn", M, 1040, INNER, 32, { visualType: "textbox",
        objects: { general: [{ properties: { paragraphs: [{ textRuns: [{ value: t, textStyle: { fontFamily: "Segoe UI", fontSize: "9pt", color: C.grey } }] }] } }] },
        visualContainerObjects: { title: [{ properties: { show: lit("false") } }], background: [{ properties: { show: lit("false") } }], border: [{ properties: { show: lit("false") } }], dropShadow: [{ properties: { show: lit("false") } }] } });
    },
  };
}

const bars = (type, category, measures, extra = {}) => {
  const q = { Y: { projections: measures.map(([m, l]) => mea(m, l)) } };
  if (category) q.Category = { projections: [{ ...col(category), active: true }] };
  return { visualType: type, query: { queryState: q }, objects: {
    legend: [{ properties: { show: lit("true"), position: str("Top"), labelColor: color(C.grey7), fontSize: lit("9D") } }],
    labels: [{ properties: { show: lit("true"), color: color(C.grey7), labelDisplayUnits: lit("1D") } }],
    dataPoint: measures.map(([m, , c]) => ({ properties: { fill: color(c) }, selector: { metadata: `${E}.${m}` } })),
    ...(category ? {} : { categoryAxis: [{ properties: { show: lit("false") } }] }), ...extra } };
};
const HH = [["c", "producer_name", "Producer"], ["c", "producer_code", "Code"], ["c", "coop_name", "Cooperative"], ["c", "season", "Season"]];
const hhTable = (kpis) => ({ visualType: "tableEx", query: { queryState: { Values: { projections:
  [...HH, ...kpis.map(([m, l]) => ["m", m, l]), ["c", "household_id", "ID"]].map(([k, p, l]) => k === "c" ? col(p, l) : mea(p, l)) } } },
  objects: { total: [{ properties: { totals: lit("false") } }] } });
const FOOT = "Medians per household in the selected currency and area unit · test data uploaded from Cocoa Capture · KPI numbers from the Cocoa PWA × COSP deck (27.09.26)";

function overview() {
  const p = Page("overview", "Overview");
  p.header("Cocoa household KPIs", "One headline per KPI group · open a group page for detail, or right-click a household → Drill through → Household detail", "Overview");
  p.pills("Pick one currency and one area unit: medians across units mean nothing");
  const cards = [["Households", "Households", "Ctx Households"], ["Median yield", "Median cocoa yield", "Ctx Yield"],
    ["Median cost per kg", "Median cost per kg", "Ctx CostKg"], ["Hired labour share", "Hired labour share", "Ctx HiredShare"],
    ["Median net cocoa income", "Median net cocoa income", "Ctx NetCocoa", "accent"], ["Below living income", "Share below living income", "Ctx BelowLI", "alert"]];
  spread(6, 16).forEach(({ x, w }, i) => p.kpi(x, 206, w, 150, ...cards[i]));
  const [a, b, c] = spread(3, 16);
  p.panel(a.x, 372, a.w, 330, "Data completeness", bars("clusteredBarChart", null, [
    ["Households", "Households", C.navy], ["HH with sales data", "With cocoa sales", C.cyan], ["HH with cost data", "With costs", C.navy5],
    ["HH with labour data", "With labour days", C.purple], ["HH fully answered", "No “Doesn’t know”", C.stone]], { valueAxis: [{ properties: { show: lit("false") } }] }));
  p.panel(b.x, 372, b.w, 330, "Households by margin status", bars("hundredPercentStackedBarChart", null, [
    ["HH price above cost", "Price above cost", C.mint], ["HH price at or below cost", "At or below cost", C.orange], ["HH no price or cost", "No price or cost", C.stone]],
    { valueAxis: [{ properties: { show: lit("false") } }] }));
  p.panel(c.x, 372, c.w, 330, "Price vs cost per kg, by cooperative", bars("clusteredBarChart", "coop_name", [["Median farmgate price", "Price", C.navy], ["Median cost per kg", "Cost", C.orange]]));
  p.panel(M, 718, INNER, 314, "Households · right-click a row → Drill through → Household detail", hhTable([
    ["Median cocoa yield", "Yield"], ["Median cost per kg", "Cost/kg"], ["Median farmgate price", "Price/kg"], ["Median margin per kg", "Margin/kg"],
    ["Median net cocoa income", "Net cocoa income"], ["Median net farm income", "Net farm income"], ["Hired labour share", "Hired labour"], ["Unknown answers", "“Doesn’t know”"]]));
  p.footnote(FOOT);
  return p;
}

function household() {
  const p = Page("household", "Household detail");
  p.header("Household detail", "Every KPI for one household, next to its cooperative’s value for the same season, currency and area unit · blank = not recorded", "Drill-through");
  const ident = [["Producer", "HH Producer"], ["Code", "HH Code"], ["Cooperative", "HH Cooperative"], ["Season", "HH Season"], ["Village", "HH Village"], ["Currency · area unit", "HH Units"]];
  spread(6, 12, INNER - 184).forEach(({ x, w }, i) => p.add("id", x, 118, w, 72, {
    visualType: "card", query: { queryState: { Values: { projections: [mea(ident[i][1], ident[i][0])] } } },
    objects: { labels: [{ properties: { color: color(C.navy), fontSize: lit("12D"), fontFamily: str("Segoe UI Semibold") } }], categoryLabels: [{ properties: { show: lit("false") } }] },
    visualContainerObjects: { title: title(ident[i][0].toUpperCase(), { size: 8, c: C.grey, align: "center" }), ...frame(C.soft, C.line2, 36, false), padding: pad(6, 12, 4, 12) },
    drillFilterOtherVisuals: true,
  }));
  p.add("back", W - M - 168, 130, 168, 48, { visualType: "actionButton",
    objects: { icon: [{ properties: { shapeType: str("back"), lineColor: color("#FFFFFF") } }],
      text: [{ properties: { show: lit("true"), text: str("Back"), fontColor: color("#FFFFFF"), fontSize: lit("12D") } }],
      fill: [{ properties: { show: lit("true"), fillColor: color(C.navy) } }] },
    visualContainerObjects: { title: [{ properties: { show: lit("false") } }], visualLink: [{ properties: { show: lit("true"), type: str("Back") } }] } });
  const cc = (m) => `Ctx coop ${m}`;
  const rows = [
    [["Cocoa area", "Median cocoa area"], ["Yield (kg per area unit)", "Median cocoa yield"], ["Volume delivered (kg)", "Median volume delivered kg"],
      ["Cash cost (cocoa)", "Median cash cost cocoa"], ["Cost per kg", "Median cost per kg"], ["Input cost per area unit", "Median input cost per area unit"]],
    [["Labour days (cocoa)", "Median labour days cocoa"], ["Hired labour share", "Hired labour share"], ["Daily wage paid", "Median daily wage"],
      ["Return per family day", "Median return on family labour"], ["Support received", "Median support value"], ["Farmgate price per kg", "Median farmgate price"]],
    [["Margin per kg", "Median margin per kg"], ["Net cocoa income", "Median net cocoa income", "accent"], ["Net farm income", "Median net farm income"],
      ["Living income gap", "Median living income gap", "alert"], ["“Doesn’t know” answers", "Unknown answers", "plain", "Ctx Unknown"]],
  ];
  const six = spread(6, 16);
  rows.forEach((row, r) => {
    const slots = r < 2 ? six : [...six.slice(0, 4), { x: six[4].x, w: six[5].x + six[5].w - six[4].x }];
    row.forEach(([label, m, tone, ctx], i) => p.kpi(slots[i].x, 206 + r * 160, slots[i].w, 146, label, m, ctx || cc(m), tone || "plain", 20));
  });
  const [l, r] = spread(2, 16);
  p.panel(l.x, 694, l.w, 338, "Cost structure (cocoa)", bars("hundredPercentStackedBarChart", null, [
    ["Cost inputs", "Inputs", C.navy], ["Cost hired labour", "Hired labour", C.cyan], ["Cost tools", "Tools", C.purple], ["Cost sharecropping", "Sharecropping", C.stone], ["Cost other", "Other", C.navy5]]));
  p.panel(r.x, 694, r.w, 338, "Family vs hired labour days (cocoa)", bars("hundredPercentStackedBarChart", null, [["Household labour days", "Family", C.navy], ["Hired labour days", "Hired", C.cyan]]));
  p.footnote("Opened by drill-through from a household row · cooperative values use households of the same cooperative, season, currency and area unit");
  return p;
}

// Group pages share one layout: header, pills, 4 KPI cards, two panels, household table, footnote.
function groupPage(name, displayName, t, sub, eyebrow, cards, left, right, tableKpis) {
  const p = Page(name, displayName);
  p.header(t, sub, eyebrow);
  p.pills("Right-click a household → Drill through → Household detail");
  spread(cards.length, 16).forEach(({ x, w }, i) => p.kpi(x, 206, w, 150, ...cards[i]));
  const [l, r] = spread(2, 16, INNER, M);
  const lw = Math.round(INNER * 0.58), rw = INNER - lw - 16;
  p.panel(M, 372, lw, 330, left[0], left[1]);
  p.panel(M + lw + 16, 372, rw, 330, right[0], right[1]);
  p.panel(M, 718, INNER, 314, "Households · right-click a row → Drill through → Household detail", hhTable(tableKpis));
  p.footnote(FOOT);
  return p;
}

const production = () => groupPage("production", "1 Production", "Production",
  "KPIs 1, 3, 4 · yield is per total cocoa area, not productive area · not yet available: area by plot status and renovation (2), harvest losses (5)", "KPI group 1",
  [["Total cocoa area", "Total cocoa area", "Ctx AreaTotal"], ["Median cocoa area", "Median cocoa area", "Ctx AreaMedian"],
    ["Median yield", "Median cocoa yield", "Ctx Yield", "accent"], ["Volume delivered (kg)", "Volume delivered kg", "Ctx Volume"]],
  ["Median yield by cooperative", bars("clusteredBarChart", "coop_name", [["Median cocoa yield", "Median yield", C.navy]])],
  ["Volume delivered by season (kg)", bars("clusteredColumnChart", "season", [["Volume delivered kg", "Volume delivered", C.cyan]])],
  [["Median cocoa area", "Cocoa area"], ["Median cocoa yield", "Yield"], ["Median volume delivered kg", "Volume (kg)"]]);

const cost = () => groupPage("cost", "2 Cost", "Cost of production",
  "KPIs 6–10 · cash costs: hired labour is costed, family labour counts as days (Labour page) · not yet available: cost by block and activity (11)", "KPI group 2",
  [["Median total cash cost (cocoa)", "Median cash cost cocoa", "Ctx CashCost"], ["Median cost per kg", "Median cost per kg", "Ctx CostKg", "accent"],
    ["Median input cost", "Median input cost per area unit", "Ctx InputArea"], ["Households buying inputs", "Input adoption", "Ctx Adoption"]],
  ["Cost structure by cooperative (cocoa)", bars("hundredPercentStackedBarChart", "coop_name", [["Cost inputs", "Inputs", C.navy], ["Cost hired labour", "Hired labour", C.cyan],
    ["Cost tools", "Tools", C.purple], ["Cost sharecropping", "Sharecropping", C.stone], ["Cost other", "Other", C.navy5]])],
  ["Median cost per kg by cooperative", bars("clusteredBarChart", "coop_name", [["Median cost per kg", "Cost per kg", C.orange]])],
  [["Median cash cost cocoa", "Cash cost"], ["Median cost per kg", "Cost/kg"], ["Median input cost per area unit", "Inputs per area unit"], ["Cost inputs", "Inputs"],
    ["Cost hired labour", "Hired labour"], ["Cost tools", "Tools"], ["Cost sharecropping", "Sharecropping"], ["Cost other", "Other"]]);

const labour = () => groupPage("labour", "3 Labour", "Labour",
  "KPIs 12–14 · cocoa only · the living wage comes from the Benchmarks table and stays blank until entered · not yet available: labour by activity (15)", "KPI group 3",
  [["Median labour days (cocoa)", "Median labour days cocoa", "Ctx LabourDays"], ["Hired labour share", "Hired labour share", "Ctx HiredShare"],
    ["Median daily wage paid", "Median daily wage", "Ctx Wage"], ["Wage as share of living wage", "Wage vs living wage", "Ctx WageLW", "accent"]],
  ["Family vs hired labour days by cooperative", bars("hundredPercentStackedBarChart", "coop_name", [["Household labour days", "Family", C.navy], ["Hired labour days", "Hired", C.cyan]])],
  ["Wage paid, living wage and return per family day", bars("clusteredBarChart", "coop_name", [["Median daily wage", "Wage paid", C.navy],
    ["Living wage daily", "Living wage", C.stone], ["Median return on family labour", "Return per family day", C.cyan]])],
  [["Median labour days cocoa", "Labour days"], ["Household labour days", "Family days"], ["Hired labour days", "Hired days"], ["Hired labour share", "Hired share"],
    ["Median daily wage", "Wage/day"], ["Median return on family labour", "Return per family day"]]);

function price() {
  const p = Page("price", "4 Price and income");
  p.header("Price and income", "KPIs 16–21 · household income = net farm income from the app · living income, LIRP and FMP come from the Benchmarks table, blank until entered", "KPI group 4");
  p.pills("Right-click a household → Drill through → Household detail");
  const rowA = [["Median farmgate price per kg", "Median farmgate price", "Ctx Price"], ["Median margin per kg", "Median margin per kg", "Ctx Margin"],
    ["Price above cost per kg", "Share above break-even", "Ctx AboveBE"], ["Price as share of LIRP", "Price vs LIRP", "Ctx PriceLIRP"], ["Paid at least the LIRP", "Share paid at least LIRP", "Ctx PaidLIRP"]];
  const rowB = [["Median net cocoa income", "Median net cocoa income", "Ctx NetCocoa", "accent"], ["Median net farm income", "Median net farm income", "Ctx NetFarm"],
    ["Living income benchmark", "Living income benchmark", "Ctx LIB"], ["Median living income gap", "Median living income gap", "Ctx LIGap", "alert"], ["Below living income", "Share below living income", "Ctx BelowLI", "alert"]];
  spread(5, 16).forEach(({ x, w }, i) => p.kpi(x, 206, w, 134, ...rowA[i], "plain", 22));
  spread(5, 16).forEach(({ x, w }, i) => { const [l, m, c, tone] = rowB[i]; p.kpi(x, 352, w, 134, l, m, c, tone || "plain", 22); });
  const lw = Math.round(INNER * 0.4);
  p.panel(M, 498, lw, 208, "Households by living income status", bars("hundredPercentStackedBarChart", null, [
    ["HH at or above living income", "At or above", C.mint], ["HH below living income", "Below", C.pink], ["HH no benchmark", "No benchmark entered", C.stone]],
    { valueAxis: [{ properties: { show: lit("false") } }] }));
  p.panel(M + lw + 16, 498, INNER - lw - 16, 208, "Price, cost and reference prices per kg", bars("clusteredBarChart", "coop_name", [
    ["Median farmgate price", "Price", C.navy], ["Median cost per kg", "Cost", C.orange], ["LIRP per kg", "LIRP", C.cyan], ["FMP per kg", "FMP", C.stone]]));
  p.panel(M, 718, INNER, 314, "Households · right-click a row → Drill through → Household detail", hhTable([
    ["Median farmgate price", "Price/kg"], ["Median cost per kg", "Cost/kg"], ["Median margin per kg", "Margin/kg"], ["Median net cocoa income", "Net cocoa income"],
    ["Median net farm income", "Net farm income"], ["Median living income gap", "Living income gap"]]));
  p.footnote(FOOT);
  return p;
}

const sustainability = () => groupPage("sustainability", "5 Sustainability", "Sustainability and data quality",
  "KPI 23: support received as subsidised inputs or labour · data quality: answers marked “Doesn’t know”, which count as 0 in the totals", "KPI group 5",
  [["Households receiving support", "Share receiving support", "Ctx SupportShare"], ["Median support value", "Median support value", "Ctx SupportValue", "accent"],
    ["Households with “Doesn’t know”", "Share with unknown answers", "Ctx UnknownShare"], ["“Doesn’t know” answers", "Unknown answers", "Ctx Unknown"]],
  ["Support received by cooperative", bars("stackedBarChart", "coop_name", [["Support inputs", "Subsidised inputs", C.navy], ["Support labour", "Subsidised labour", C.cyan]])],
  ["“Doesn’t know” answers by cooperative", bars("clusteredBarChart", "coop_name", [["Unknown answers", "Answers", C.stone]])],
  [["Support inputs", "Subsidised inputs"], ["Support labour", "Subsidised labour"], ["Unknown answers", "“Doesn’t know”"]]);

// Default: only the five group pages (Overview and Household detail are approved; don't touch them).
const ALL = { overview, household, production, cost, labour, price, sustainability };
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const pages = (wanted.length ? wanted : ["production", "cost", "labour", "price", "sustainability"]).map((n) => ALL[n]());
const reportPath = path.join(RP, "definition/report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const reg = report.resourcePackages.find((r) => r.name === "RegisteredResources");
if (reg) reg.items = reg.items.filter((i) => i.type !== "Image");          // drop the v3 background images
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
for (const f of ["overview_bg.png", "household_bg.png"]) fs.rmSync(path.join(RP, "StaticResources/RegisteredResources", f), { force: true });

for (const p of pages) {
  const dir = path.join(RP, "definition/pages", p.name);
  const old = path.join(dir, "page.json");
  // Keep whatever Power BI saved for the page (drill-through set-up), minus the v3 background image.
  const page = fs.existsSync(old) ? JSON.parse(fs.readFileSync(old, "utf8")) : {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
    name: p.name, displayName: p.displayName, displayOption: "FitToPage", height: 1080, width: W };
  delete page.objects;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "visuals"), { recursive: true });
  fs.writeFileSync(old, JSON.stringify(page, null, 2));
  for (const v of p.visuals) {
    fs.mkdirSync(path.join(dir, "visuals", v.name), { recursive: true });
    fs.writeFileSync(path.join(dir, "visuals", v.name, "visual.json"), JSON.stringify(v, null, 2));
  }
  console.log(`${p.name}: ${p.visuals.length} visuals`);
}
