-- schema.sql — Supabase (PostgreSQL) schema for the cocoa household app.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.
--
-- One table, two ways to read it:
--   public.households       one row per household record, as uploaded by the
--                           app: identity columns + the full record (jsonb) +
--                           `summary` (jsonb, the CSV export's row).
--   public.households_flat  a view that turns `summary` into typed columns:
--                           exactly the columns of the app's CSV export, one
--                           row per household. This is what Python, R and
--                           Power BI should read (see analysis/README.md).
--
-- The flat view's column list is generated from csvRowForRecord() in
-- app-react/src/lib/storage.ts. If a CSV column is added there, add it here
-- too (older rows simply show NULL for it).

create table if not exists public.households (
  id                 text primary key,          -- meta.id, generated on the device
  farmer_id          text not null,             -- meta.farmerId (per device!)
  producer_code      text,                      -- cross-device farmer key
  season             text,
  coop_name          text,
  coach_name         text,
  coach_user         uuid not null default auth.uid() references auth.users (id),
  record_updated_at  timestamptz not null,      -- meta.updatedAt on the device
  uploaded_at        timestamptz not null default now(),
  format_version     int,
  app_version        text,
  record             jsonb not null,            -- the full household record
  summary            jsonb not null             -- the CSV row (inputs + results)
);

create index if not exists households_producer_season on public.households (producer_code, season);
create index if not exists households_coop on public.households (coop_name);

-- Re-uploading a record overwrites it; keep uploaded_at current.
create or replace function public.touch_uploaded_at() returns trigger
language plpgsql as $$
begin
  new.uploaded_at := now();
  return new;
end $$;

drop trigger if exists households_touch on public.households;
create trigger households_touch before update on public.households
  for each row execute function public.touch_uploaded_at();

-- Row-level security: a signed-in coach can add and update their own uploads
-- and nothing else. The app's public (anon) key cannot read anything.
-- Analysts read through a database role (below), not through the app's key.
alter table public.households enable row level security;

drop policy if exists coach_insert on public.households;
create policy coach_insert on public.households for insert to authenticated
  with check (coach_user = auth.uid());

drop policy if exists coach_update on public.households;
create policy coach_update on public.households for update to authenticated
  using (coach_user = auth.uid()) with check (coach_user = auth.uid());

-- Upsert (insert ... on conflict update) needs to see the existing row.
drop policy if exists coach_select_own on public.households;
create policy coach_select_own on public.households for select to authenticated
  using (coach_user = auth.uid());

create or replace view public.households_flat
with (security_invoker = true) as
select
  h.uploaded_at,
  h.coach_user,
  h.app_version,
  h.summary->>'household_id' as household_id,
  h.summary->>'farmer_id' as farmer_id,
  h.summary->>'season' as season,
  h.summary->>'coop_name' as coop_name,
  h.summary->>'flo_id' as flo_id,
  h.summary->>'coach_name' as coach_name,
  h.summary->>'programme' as programme,
  h.summary->>'producer_name' as producer_name,
  h.summary->>'producer_code' as producer_code,
  h.summary->>'village' as village,
  h.summary->>'gps' as gps,
  h.summary->>'area_unit' as area_unit,
  h.summary->>'currency_unit' as currency_unit,
  nullif(h.summary->>'cocoa_area_ims', '')::numeric as cocoa_area_ims,
  nullif(h.summary->>'total_farm_area_ims', '')::numeric as total_farm_area_ims,
  nullif(h.summary->>'cocoa_volume_produced_ims', '')::numeric as cocoa_volume_produced_ims,
  nullif(h.summary->>'cocoa_volume_sold_coop_ims', '')::numeric as cocoa_volume_sold_coop_ims,
  nullif(h.summary->>'farmgate_price_main', '')::numeric as farmgate_price_main,
  nullif(h.summary->>'farmgate_price_mid', '')::numeric as farmgate_price_mid,
  nullif(h.summary->>'fp_distributed', '')::numeric as fp_distributed,
  nullif(h.summary->>'other_diff_distributed', '')::numeric as other_diff_distributed,
  nullif(h.summary->>'total_cocoa_only_area', '')::numeric as total_cocoa_only_area,
  nullif(h.summary->>'total_intercropped_cocoa_area', '')::numeric as total_intercropped_cocoa_area,
  nullif(h.summary->>'total_cocoa_area', '')::numeric as total_cocoa_area,
  nullif(h.summary->>'total_cultivated_area', '')::numeric as total_cultivated_area,
  nullif(h.summary->>'fallow_land', '')::numeric as fallow_land,
  nullif(h.summary->>'total_farm_area_farmer', '')::numeric as total_farm_area_farmer,
  nullif(h.summary->>'pct_cocoa_area_sharecropped', '')::numeric as pct_cocoa_area_sharecropped,
  nullif(h.summary->>'pct_farm_area_sharecropped', '')::numeric as pct_farm_area_sharecropped,
  nullif(h.summary->>'hh_members_working_farm', '')::numeric as hh_members_working_farm,
  nullif(h.summary->>'hh_fte_working_farm', '')::numeric as hh_fte_working_farm,
  nullif(h.summary->>'hh_total_members', '')::numeric as hh_total_members,
  nullif(h.summary->>'hh_working_age_members', '')::numeric as hh_working_age_members,
  nullif(h.summary->>'total_cocoa_volume_sold_kg', '')::numeric as total_cocoa_volume_sold_kg,
  nullif(h.summary->>'avg_cocoa_price_per_kg', '')::numeric as avg_cocoa_price_per_kg,
  nullif(h.summary->>'total_cocoa_sales_revenue', '')::numeric as total_cocoa_sales_revenue,
  nullif(h.summary->>'total_other_cocoa_income', '')::numeric as total_other_cocoa_income,
  nullif(h.summary->>'total_cocoa_revenue', '')::numeric as total_cocoa_revenue,
  nullif(h.summary->>'total_coffee_revenue', '')::numeric as total_coffee_revenue,
  nullif(h.summary->>'total_other_cash_crop_revenue', '')::numeric as total_other_cash_crop_revenue,
  nullif(h.summary->>'total_staple_food_value', '')::numeric as total_staple_food_value,
  nullif(h.summary->>'total_other_food_value', '')::numeric as total_other_food_value,
  nullif(h.summary->>'total_livestock_value', '')::numeric as total_livestock_value,
  nullif(h.summary->>'total_other_farm_income', '')::numeric as total_other_farm_income,
  nullif(h.summary->>'total_farm_revenue', '')::numeric as total_farm_revenue,
  nullif(h.summary->>'total_agri_input_cost', '')::numeric as total_agri_input_cost,
  nullif(h.summary->>'total_agri_input_cost_cocoa', '')::numeric as total_agri_input_cost_cocoa,
  nullif(h.summary->>'total_subsidized_input_value', '')::numeric as total_subsidized_input_value,
  nullif(h.summary->>'total_tools_cost', '')::numeric as total_tools_cost,
  nullif(h.summary->>'total_tools_depreciated_cost', '')::numeric as total_tools_depreciated_cost,
  nullif(h.summary->>'total_tools_depreciated_cost_cocoa', '')::numeric as total_tools_depreciated_cost_cocoa,
  nullif(h.summary->>'total_other_cost', '')::numeric as total_other_cost,
  nullif(h.summary->>'total_other_cost_cocoa', '')::numeric as total_other_cost_cocoa,
  nullif(h.summary->>'total_sharecrop_payment_cost', '')::numeric as total_sharecrop_payment_cost,
  nullif(h.summary->>'total_sharecrop_payment_cost_cocoa', '')::numeric as total_sharecrop_payment_cost_cocoa,
  nullif(h.summary->>'total_inkind_cocoa_volume_to_sharecroppers', '')::numeric as total_inkind_cocoa_volume_to_sharecroppers,
  nullif(h.summary->>'total_farm_cost', '')::numeric as total_farm_cost,
  nullif(h.summary->>'total_cocoa_cost', '')::numeric as total_cocoa_cost,
  nullif(h.summary->>'total_household_labour_days', '')::numeric as total_household_labour_days,
  nullif(h.summary->>'total_household_labour_days_cocoa', '')::numeric as total_household_labour_days_cocoa,
  nullif(h.summary->>'total_hired_labour_days', '')::numeric as total_hired_labour_days,
  nullif(h.summary->>'total_hired_labour_days_cocoa', '')::numeric as total_hired_labour_days_cocoa,
  nullif(h.summary->>'avg_daily_wage', '')::numeric as avg_daily_wage,
  nullif(h.summary->>'total_labour_cost', '')::numeric as total_labour_cost,
  nullif(h.summary->>'total_labour_cost_cocoa', '')::numeric as total_labour_cost_cocoa,
  nullif(h.summary->>'total_subsidized_labour_value', '')::numeric as total_subsidized_labour_value,
  nullif(h.summary->>'net_farm_income', '')::numeric as net_farm_income,
  nullif(h.summary->>'net_cocoa_income', '')::numeric as net_cocoa_income,
  nullif(h.summary->>'cocoa_yield_per_area_unit', '')::numeric as cocoa_yield_per_area_unit,
  nullif(h.summary->>'cost_of_cocoa_production_per_area_unit', '')::numeric as cost_of_cocoa_production_per_area_unit,
  nullif(h.summary->>'cost_of_cocoa_production_per_kg', '')::numeric as cost_of_cocoa_production_per_kg,
  nullif(h.summary->>'return_on_labour_farm', '')::numeric as return_on_labour_farm,
  nullif(h.summary->>'return_on_labour_cocoa', '')::numeric as return_on_labour_cocoa,
  nullif(h.summary->>'hh_expenditure_food', '')::numeric as hh_expenditure_food,
  nullif(h.summary->>'hh_expenditure_education', '')::numeric as hh_expenditure_education,
  nullif(h.summary->>'hh_expenditure_healthcare', '')::numeric as hh_expenditure_healthcare,
  nullif(h.summary->>'hh_expenditure_other', '')::numeric as hh_expenditure_other,
  nullif(h.summary->>'hh_expenditure_total', '')::numeric as hh_expenditure_total,
  h.summary->>'consent_respondent_name' as consent_respondent_name,
  h.summary->>'consent_date' as consent_date,
  (h.summary->>'consent_release_fi')::boolean as consent_release_fi,
  (h.summary->>'consent_release_coop')::boolean as consent_release_coop,
  (h.summary->>'consent_release_pn')::boolean as consent_release_pn,
  (h.summary->>'consent_release_buyers')::boolean as consent_release_buyers,
  nullif(h.summary->>'unknown_field_count', '')::numeric as unknown_field_count,
  h.summary->>'unknown_fields' as unknown_fields,
  h.summary->>'record_updated_at' as record_updated_at
from public.households h;

-- ---------------------------------------------------------------------------
-- Read-only login for analysis tools (Python, R, Power BI).
-- Run this block ONCE, separately, after replacing CHANGE-ME with a strong
-- password (keep it in a password manager, not in the repo). Analysts then
-- connect with user "analyst.<project-ref>" through the session pooler; see
-- analysis/README.md.
-- ---------------------------------------------------------------------------
-- create role analyst with login password 'CHANGE-ME';
-- grant usage on schema public to analyst;
-- grant select on public.households, public.households_flat to analyst;
-- create policy analyst_read on public.households for select to analyst using (true);
