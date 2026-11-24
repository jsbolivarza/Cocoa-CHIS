// Generates, from the app's own data model (app-react/src/lib):
//   supabase/raw_views.sql          one typed database view per repeating table
//   analysis/codebook/options.csv   every answer code with its EN/FR/ES label
//   analysis/codebook/columns.csv   every raw-view column: type, label, code list
// Run through run.mjs (it prepares ./_lib), never by hand-editing the outputs.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TABLE_SCHEMAS, REVENUE_SECTIONS } from "./_lib/dataModel.ts";
import { OPTIONS, STR } from "./_lib/i18n.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

type Col = { key: string; type: "number" | "text"; label: string; codes?: string };
type View = { name: string; path: string[]; cols: Col[]; gate?: string; monthly?: boolean; note: string };

const snake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const en = (key: string) => STR[key]?.en ?? key;

function fromSchema(table: string, path: string[], note: string): View {
  const cols: Col[] = TABLE_SCHEMAS[table].columns
    .filter((c) => c.type !== "index")
    .map((c) => ({
      key: c.key,
      type: c.type === "number" ? "number" : "text",
      label: en(c.labelKey),
      codes: c.type === "select" ? (c.optionsKey ?? `static:${(c.staticOptions ?? []).join("|")}`) : undefined,
    }));
  const gate = REVENUE_SECTIONS.find((s) => s.arrays.includes(path[path.length - 1] as never))?.key;
  return { name: `raw_${snake(path[path.length - 1])}`, path, cols, gate, note };
}

const monthlySales = (arr: string, gate?: string): View => ({
  name: `raw_${snake(arr)}`,
  path: ["revenues", arr],
  monthly: true,
  gate,
  note: `One row per month (Oct-Sep season). Revenue = volume x price.`,
  cols: [
    { key: "month", type: "text", label: "Month", codes: "months" },
    { key: "volume", type: "number", label: "Volume sold" },
    { key: "price", type: "number", label: "Price per unit" },
  ],
});

const views: View[] = [
  fromSchema("plots", ["profile", "plots"], "Land plots."),
  fromSchema("householdWorking", ["profile", "householdWorking"], "Household members who work on the farm. pct_time is a 0-1 share."),
  fromSchema("householdNotWorking", ["profile", "householdNotWorking"], "Household members who do not work on the farm."),
  monthlySales("cocoaSales"),
  fromSchema("cocoaOtherIncome", ["revenues", "cocoaOtherIncome"], "Other cocoa income (premiums, differentials, subsidies)."),
  monthlySales("coffeeSales", "coffee"),
  fromSchema("coffeeOtherIncome", ["revenues", "coffeeOtherIncome"], "Other coffee income."),
  fromSchema("otherCashCrops", ["revenues", "otherCashCrops"], "Other cash crops; q1-q4 = quarterly volume sold."),
  fromSchema("stapleCrops", ["revenues", "stapleCrops"], "Staple food crops; q1-q4 = quarterly production."),
  fromSchema("otherFoodCrops", ["revenues", "otherFoodCrops"], "Other food crops."),
  fromSchema("livestock", ["revenues", "livestock"], "Livestock products."),
  fromSchema("otherIncome", ["revenues", "otherIncome"], "Other farm income."),
  fromSchema("agriInputs", ["costs", "agriInputs"], "Agricultural inputs. used_for_cocoa is a share code (see options.csv weight)."),
  fromSchema("tools", ["costs", "tools"], "Tools and equipment. Cost per year = total_cost / lifespan unless depreciated_cost is given."),
  fromSchema("otherCosts", ["costs", "otherCosts"], "Other costs."),
  fromSchema("sharecropPayments", ["costs", "sharecropPayments"], "Land-sharing / sharecropping payments."),
  {
    name: "raw_labour",
    path: ["labour"],
    monthly: true,
    note: "One row per month. Hired labour cost = hired_days x daily_wage + service_cost + service_cost2 + service_cost3. A service line counts for cocoa unless its used_for is non_cocoa. Lines 2 and 3 exist from formatVersion 4 (app 0.6.0); blank on older records.",
    cols: [
      { key: "month", type: "text", label: "Month", codes: "months" },
      { key: "hhDays", type: "number", label: "Household labour days" },
      { key: "hhDaysCocoa", type: "number", label: "Household labour days on cocoa" },
      { key: "hiredDays", type: "number", label: "Hired labour days" },
      { key: "hiredDaysCocoa", type: "number", label: "Hired labour days on cocoa" },
      { key: "dailyWage", type: "number", label: "Daily wage" },
      { key: "otherService", type: "text", label: "Other hired service (line 1)", codes: "labour_service_type" },
      { key: "serviceUsedFor", type: "text", label: "Service used for (line 1)", codes: "static:cocoa|non_cocoa" },
      { key: "serviceCost", type: "number", label: "Service cost (line 1)" },
      { key: "otherService2", type: "text", label: "Other hired service (line 2)", codes: "labour_service_type" },
      { key: "serviceUsedFor2", type: "text", label: "Service used for (line 2)", codes: "static:cocoa|non_cocoa" },
      { key: "serviceCost2", type: "number", label: "Service cost (line 2)" },
      { key: "otherService3", type: "text", label: "Other hired service (line 3)", codes: "labour_service_type" },
      { key: "serviceUsedFor3", type: "text", label: "Service used for (line 3)", codes: "static:cocoa|non_cocoa" },
      { key: "serviceCost3", type: "number", label: "Service cost (line 3)" },
      { key: "subsidizedLabour", type: "number", label: "Subsidized labour value" },
    ],
  },
];

const ID_COLS = `h.id as household_id, h.farmer_id, h.producer_code, h.season, h.coop_name`;

function viewSql(v: View): string {
  const jsonPath = `{${v.path.join(",")}}`;
  const colSql = v.cols.map((c) =>
    c.type === "number"
      ? `  public.to_num(t.r->>'${c.key}') as ${snake(c.key)}`
      : `  nullif(t.r->>'${c.key}', '') as ${snake(c.key)}`
  );
  const extra = [
    ...(v.monthly ? [`  array_position(array['oct','nov','dec','jan','feb','mar','apr','may','jun','jul','aug','sep'], t.r->>'month') as month_no`] : []),
    ...(v.gate ? [`  coalesce((h.record->'revenues'->'has'->>'${v.gate}')::boolean, false) as included_in_totals`] : []),
  ];
  // Monthly tables keep all 12 months; other tables drop rows nothing was typed in.
  const where = v.monthly
    ? ""
    : `\nwhere exists (select 1 from jsonb_each_text(t.r) kv where kv.value not in ('', 'false'))`;
  return `-- ${v.note}
create or replace view public.${v.name} with (security_invoker = true) as
select ${ID_COLS},
  t.row_no::int as row_no,
${[...colSql, ...extra].join(",\n")}
from public.households_current h,
  jsonb_array_elements(coalesce(h.record #> '${jsonPath}', '[]'::jsonb)) with ordinality as t(r, row_no)${where};
grant select on public.${v.name} to analyst;
`;
}

const header = `-- raw_views.sql: one typed view per repeating table in a household record,
-- so analysts get tidy tables instead of JSON. GENERATED by
-- analysis/tools/run.mjs from the app's data model; do not edit by hand.
-- Run in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- Requires schema.sql and the analyst role (end of schema.sql) first.
-- Views read households_current: one row per coop + member code + season,
-- the most recently saved upload (see schema.sql).
--
-- Every view starts with household_id (= households.id = households_flat.
-- household_id), farmer_id, producer_code, season, coop_name, so it joins
-- to households_flat on household_id. Answer codes (e.g. 'fertilizer',
-- '75_99') are explained in analysis/codebook/options.csv.

-- Text to number without failing on odd input (returns NULL instead).
create or replace function public.to_num(v text) returns numeric
language plpgsql immutable as $$
begin
  return nullif(v, '')::numeric;
exception when others then
  return null;
end $$;
grant execute on function public.to_num(text) to analyst;
grant select on public.households_current, public.households_duplicates to analyst;

`;

const expenditures = `-- Household spending: one row per category and quarter.
create or replace view public.raw_expenditures with (security_invoker = true) as
select ${ID_COLS},
  c.category,
  q.quarter,
  public.to_num(h.record->'expenditures'->c.category->>q.quarter) as amount
from public.households_current h,
  unnest(array['food','education','healthcare','other']) as c(category),
  unnest(array['q1','q2','q3','q4']) as q(quarter);
grant select on public.raw_expenditures to analyst;

-- Answers marked "Doesn't know": one row per field. The value columns for
-- these fields are blank, and the app's totals count them as 0.
create or replace view public.raw_unknown_answers with (security_invoker = true) as
select ${ID_COLS},
  u.path as field_path,
  split_part(u.path, '.', 1) as step
from public.households_current h,
  jsonb_array_elements_text(coalesce(h.record->'meta'->'unknownFields', '[]'::jsonb)) as u(path);
grant select on public.raw_unknown_answers to analyst;
`;

writeFileSync(resolve(repo, "supabase/raw_views.sql"), header + views.map(viewSql).join("\n") + "\n" + expenditures);

// Codebook
const csv = (rows: (string | number | undefined)[][]) =>
  rows.map((r) => r.map((v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n") + "\n";

const optRows: (string | number | undefined)[][] = [["list", "code", "label_en", "label_fr", "label_es", "weight"]];
for (const [list, items] of Object.entries(OPTIONS)) {
  for (const o of items as { key: string; en: string; fr: string; es: string; weight?: number }[]) {
    optRows.push([list, o.key, o.en, o.fr, o.es, o.weight]);
  }
}
const statics = new Set<string>();
views.forEach((v) => v.cols.forEach((c) => c.codes?.startsWith("static:") && c.codes.slice(7).split("|").forEach((k) => statics.add(k))));
for (const k of statics) optRows.push(["static", k, STR[k]?.en, STR[k]?.fr, STR[k]?.es, undefined]);

const colRows: (string | undefined)[][] = [["view", "column", "type", "label", "code_list", "note"]];
for (const v of views) {
  for (const c of v.cols) {
    colRows.push([v.name, snake(c.key), c.type === "number" ? "numeric" : "text", c.label, c.codes?.startsWith("static:") ? "static" : c.codes, undefined]);
  }
  if (v.gate) colRows.push([v.name, "included_in_totals", "boolean", "Section answered Yes on the Revenues step", undefined, "Rows with false are kept in the record but excluded from all totals"]);
  colRows.push([v.name, "*", undefined, undefined, undefined, v.note]);
}
colRows.push(["raw_expenditures", "amount", "numeric", "Amount spent", undefined, "category: food/education/healthcare/other; quarter: q1-q4"]);
colRows.push(["raw_unknown_answers", "field_path", "text", "Field answered \"Doesn't know\"", undefined, "Record path, e.g. costs.agriInputs.1.totalCost (row index from 0)"]);

mkdirSync(resolve(repo, "analysis/codebook"), { recursive: true });
writeFileSync(resolve(repo, "analysis/codebook/options.csv"), csv(optRows));
writeFileSync(resolve(repo, "analysis/codebook/columns.csv"), csv(colRows));
console.log(`views: ${views.length + 2}, option codes: ${optRows.length - 1}, columns: ${colRows.length - 1}`);
