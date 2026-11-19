# read_households.R — read uploaded cocoa household data into R.
#
# Setup (once):
#   install.packages(c("DBI", "RPostgres", "dplyr"))
#
# Connection details come from environment variables (e.g. in ~/.Renviron),
# never from this file:
#   PGHOST=aws-0-<region>.pooler.supabase.com   (Supabase: Connect -> Session pooler)
#   PGPORT=5432
#   PGDATABASE=postgres
#   PGUSER=analyst.<project-ref>
#   PGPASSWORD=<analyst password>

library(DBI)
library(dplyr)

con <- dbConnect(RPostgres::Postgres(), sslmode = "require")  # reads the PG* variables

# 1. The flat table: one row per household, same columns as the app's CSV
#    export (inputs + every calculated result). Start here.
flat <- dbGetQuery(con, "select * from public.households_flat")
cat(nrow(flat), "households\n")

flat |>
  group_by(coop_name, season) |>
  summarise(
    households = n(),
    median_net_cocoa_income = median(net_cocoa_income, na.rm = TRUE),
    median_cost_per_kg = median(cost_of_cocoa_production_per_kg, na.rm = TRUE),
    .groups = "drop"
  ) |>
  print()

# 2. Detail from the full record (jsonb): monthly cocoa sales.
monthly <- dbGetQuery(con, "
  select h.id as household_id, h.producer_code, h.season,
         m->>'month' as month,
         nullif(m->>'volume', '')::numeric as volume,
         nullif(m->>'price', '')::numeric as price
  from public.households_current h,
       jsonb_array_elements(h.record->'revenues'->'cocoaSales') as m
")
print(head(subset(monthly, !is.na(volume))))

# 3. "Doesn't know" answers.
print(subset(flat, unknown_field_count > 0, c(producer_code, unknown_fields)))

dbDisconnect(con)
