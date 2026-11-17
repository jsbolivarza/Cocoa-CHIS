"""read_households.py — read uploaded cocoa household data into pandas.

Setup (once):
    pip install pandas "psycopg[binary]" sqlalchemy

Connection details come from environment variables, never from this file:
    PGHOST      aws-0-<region>.pooler.supabase.com   (Supabase: Connect -> Session pooler)
    PGPORT      5432
    PGDATABASE  postgres
    PGUSER      analyst.<project-ref>
    PGPASSWORD  the analyst password

Run:
    python analysis/read_households.py
"""

import os

import pandas as pd
from sqlalchemy import create_engine, text


def engine():
    url = (
        f"postgresql+psycopg://{os.environ['PGUSER']}:{os.environ['PGPASSWORD']}"
        f"@{os.environ['PGHOST']}:{os.environ.get('PGPORT', '5432')}"
        f"/{os.environ.get('PGDATABASE', 'postgres')}?sslmode=require"
    )
    return create_engine(url)


def main():
    eng = engine()

    # 1. The flat table: one row per household, same columns as the app's
    #    CSV export (inputs + every calculated result). Start here.
    flat = pd.read_sql("select * from public.households_flat", eng)
    print(f"{len(flat)} households")
    print(flat[["producer_code", "season", "total_farm_revenue", "total_farm_cost", "net_farm_income"]].head())

    # Example: net cocoa income by cooperative and season.
    summary = (
        flat.groupby(["coop_name", "season"])[["net_cocoa_income", "cost_of_cocoa_production_per_kg"]]
        .median()
        .round(2)
    )
    print(summary)

    # 2. Detail the flat table doesn't have, straight from the full record
    #    (jsonb). Example: monthly cocoa sales, one row per household x month.
    monthly = pd.read_sql(
        text(
            """
            select h.id as household_id,
                   h.producer_code,
                   h.season,
                   m->>'month' as month,
                   nullif(m->>'volume', '')::numeric as volume,
                   nullif(m->>'price', '')::numeric as price
            from public.households h,
                 jsonb_array_elements(h.record->'revenues'->'cocoaSales') as m
            """
        ),
        eng,
    )
    print(monthly.dropna(subset=["volume"]).head())

    # 3. "Doesn't know" answers: a blank value in the flat table is either
    #    "doesn't know" (listed in unknown_fields) or not answered/zero.
    print(flat.loc[flat["unknown_field_count"] > 0, ["producer_code", "unknown_fields"]])


if __name__ == "__main__":
    main()
