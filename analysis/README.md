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

In Supabase, **Connect** (top bar) > **Session pooler**:

| Setting | Value |
|---|---|
| Host | `aws-0-<region>.pooler.supabase.com` |
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
3. Credentials: **Database** tab, user `analyst.<project-ref>`, the analyst
   password.
4. Pick `public.households_flat` > Load. Each household is a row; build
   visuals on `coop_name`, `season`, `net_cocoa_income`,
   `cost_of_cocoa_production_per_kg`, etc.
5. **Refresh** pulls newly uploaded households.

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
