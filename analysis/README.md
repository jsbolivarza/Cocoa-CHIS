# Reading the household data (prototype server)

How data gets from a coach's tablet into Python, R and Power BI.

```
Tablet (IndexedDB)  --Settings > Upload now-->  Supabase (PostgreSQL)  -->  Python / R / Power BI
  captured offline       only households with        households (full record, jsonb)
  stays on the device    FI consent ticked           households_flat (one row, ~90 columns)
```

- **Upload is one way and manual.** The tablet is where data is captured and
  edited; the server holds a copy for analysis. Re-uploading an edited record
  overwrites its server copy. Deleting a record on the tablet does **not**
  delete it on the server.
- **Consent rule:** a household is uploaded only if "Fairtrade International"
  is ticked under "release my data to" on the Consent step.
- **Prototype only.** Use test households until data protection has signed off
  on where the data is hosted (Supabase free tier, EU region).

## 1. Set up the server (once, about 15 minutes)

1. Create a free account at supabase.com and a new project. Pick an EU
   region (e.g. Frankfurt). Keep the database password it shows you.
2. **SQL Editor > New query**, paste `supabase/schema.sql`, Run.
3. Create the read-only analyst login: in the same editor run the commented
   block at the end of `schema.sql`, uncommented, with your own password.
4. **Authentication > Users > Add user**: one user per coach (email +
   password). Under **Authentication > Sign In / Providers**, turn off
   "Allow new users to sign up" so nobody else can create an account.
5. **Project Settings > API**: copy the Project URL and the anon / publishable
   key into `app-react/.env.local` (see `app-react/.env.example`), then restart
   `npm run dev`. Settings in the app now shows **Upload to server**.

Free tier limits worth knowing: 500 MB database (tens of thousands of
households), and the project **pauses after 7 days without activity**. Open
the dashboard and click Restore if that happens; no data is lost. The Pro plan
($25/month) removes the pause and adds daily backups.

## 2. What is in the database

| Table / view | One row per | Use it for |
|---|---|---|
| `households_flat` | household record | almost everything: the same columns as the app's CSV export, typed (numbers are numbers) |
| `households` | household record | detail not in the flat table: `record` holds the full record as JSON (every table row, every month) |

Useful columns: `producer_code` + `season` identify a farmer's season across
devices; `farmer_id` only links seasons captured on the same tablet.
`unknown_field_count` / `unknown_fields` list answers marked "Doesn't know"
(they are blank in the value columns and count as 0 in the totals).

## 3. Connection details for Python, R and Power BI

In Supabase, **Connect** (top bar) > **Direct** tab > set **Method** to
**Session pooler** (the **Type** dropdown, URI/PSQL/…, is only the format;
pick URI). The host is the part of the URI between `@` and `:5432`.

| Setting | Value |
|---|---|
| Host | `aws-<n>-<region>.pooler.supabase.com` (this project: `aws-1-eu-west-1.pooler.supabase.com`) |
| Port | `5432` |
| Database | `postgres` |
| User | `analyst.<project-ref>` (the part after `analyst.` is in the project URL) |
| Password | the analyst password from step 1.3 |
| SSL | required |

Use the session pooler, not the "direct connection": the direct host is
IPv6-only on the free tier and most office networks can't reach it.

## 4. Python

```
pip install pandas "psycopg[binary]" sqlalchemy
set the PG* variables (see read_households.py)
python analysis/read_households.py
```

Minimal version:

```python
import pandas as pd
df = pd.read_sql("select * from households_flat",
                 "postgresql+psycopg://analyst.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require")
```

## 5. R

```r
install.packages(c("DBI", "RPostgres", "dplyr"))
source("analysis/read_households.R")   # reads PG* variables from ~/.Renviron
```

## 6. Power BI Desktop

1. **Get data > PostgreSQL database**.
2. Server: `aws-0-<region>.pooler.supabase.com:5432`, Database: `postgres`,
   Data connectivity mode: **Import**.
3. Credentials: user `analyst.<project-ref>` and the analyst password.
   Not your Supabase website login (email): that one is for the dashboard,
   not the database.

   **"The remote certificate is invalid according to the validation
   procedure"**: Windows doesn't know Supabase's certificate authority.
   Fix once per laptop: Supabase > Project Settings > Database > SSL
   Configuration > **Download certificate**; double-click the `.crt` >
   Install Certificate > Current User > place in **Trusted Root
   Certification Authorities**; restart Power BI. Keep "Use encrypted
   connection" ticked; unticking it sends the password unencrypted.
4. Pick `public.households_flat` > Load. Each household is a row; build
   visuals on `coop_name`, `season`, `net_cocoa_income`,
   `cost_of_cocoa_production_per_kg`, etc.
5. **Refresh** pulls newly uploaded households.

Prototype dashboard (17.11.26): `Cocoa prototype dashboard - redesigned.pbix`
on JB's desktop (not in git: a .pbix contains the data). One page: navy
header with Season/Cooperative slicers, 4 cards (households, median net
farm and cocoa income, "Doesn't know" answers), money in/out per
household, price vs cost per kg, household table. Medians, not averages:
with few households per group an average is one farmer's number.
If a .pbix is edited outside Power BI (its `Report/definition/*.json`),
remove `SecurityBindings` and its line in `[Content_Types].xml` when
repacking, or Power BI reports the file as corrupted.

For monthly detail, add a second query via **Advanced options > SQL
statement**, using the `jsonb_array_elements` query in `read_households.py`.

Scheduled refresh in the Power BI Service needs an on-premises data gateway
for PostgreSQL, or a Pro/Premium workspace. For a prototype, refreshing in
Desktop is enough.

## Not built yet

- Download from the server to a tablet (e.g. a coach changes device).
- Deleting on the server when a record is deleted on a tablet.
- A coach seeing only their own coop: today each coach can write only their
  own uploads, and analysts see everything.

## 7. Raw data (for analysts)

`households_flat` has one row per household with totals. For everything
behind those totals (each plot, member, input purchase, month of sales and
labour, quarter of spending), run **`supabase/raw_views.sql`** once in the
Supabase SQL Editor. It creates one tidy, typed view per table:

| View | One row per |
|---|---|
| `raw_plots`, `raw_household_working`, `raw_household_not_working` | plot / household member |
| `raw_cocoa_sales`, `raw_coffee_sales`, `raw_labour` | month (all 12, `month_no` 1 = October) |
| `raw_cocoa_other_income`, `raw_coffee_other_income`, `raw_other_cash_crops`, `raw_staple_crops`, `raw_other_food_crops`, `raw_livestock`, `raw_other_income` | income row |
| `raw_agri_inputs`, `raw_tools`, `raw_other_costs`, `raw_sharecrop_payments` | cost row |
| `raw_expenditures` | spending category x quarter |
| `raw_unknown_answers` | answer marked "Doesn't know" |

Every view starts with `household_id, farmer_id, producer_code, season,
coop_name`; join to `households_flat` on `household_id`.

Things the analyst must know:
- **Codes, not labels.** Answers are stored as codes (`fertilizer`,
  `owner_sharecropper`, `75_99`). `codebook/options.csv` gives the EN/FR/ES
  label and, for `cocoa_share`, the **weight** the app uses to split a
  cost between cocoa and other crops. `codebook/columns.csv` describes
  every column and which code list it uses.
- **`included_in_totals`** (coffee, other cash crops, staple, other food,
  livestock, other income): `false` means the household answered "No" on
  the Revenues step. Those rows stay in the record but the app's totals
  ignore them. Do the same.
- **"Doesn't know"**: those fields are blank (NULL), and the app counts
  them as 0. `raw_unknown_answers.field_path` lists them; its row numbers
  start at 0, while `row_no` in the views starts at 1.
- Empty table rows are dropped, except the monthly tables, which keep all
  12 months.
- The app's own calculations (`app-react/src/lib/calc.ts`) are already
  applied in `households_flat`. Recompute from the raw views only to check
  them or to answer new questions.

Load everything at once:
- **Python**: `python analysis/export_raw.py --labels --csv raw_export`
  (or `from export_raw import load_all` in a notebook).
- **R**: `install.packages(c("DBI", "RPostgres"))`, then
  `Rscript analysis/export_raw.R raw_export` (or
  `source("analysis/export_raw.R"); t <- load_all(labels = TRUE)`).

Both read the PG* environment variables from section 3 and find the
`raw_*` views automatically. **When the app's record format changes**, run
`node analysis/tools/run.mjs` to regenerate `raw_views.sql` and the
codebook from the app's data model, then re-run `raw_views.sql` in
Supabase.
