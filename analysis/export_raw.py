"""export_raw.py: load every household table from Supabase into pandas,
optionally write them all to CSV.

Tables:
  households_flat        one row per household-season: inputs + all results
  raw_<table>            one row per table row (plots, members, inputs, ...)
  raw_cocoa_sales, raw_labour, ...  one row per month
  raw_expenditures       one row per spending category and quarter
  raw_unknown_answers    one row per answer marked "Doesn't know"
Join any of them to households_flat on household_id. Codes are explained
in analysis/codebook/options.csv (labels) and columns.csv (what each column
is). See analysis/README.md, section "Raw data".

Setup (once):
    pip install pandas "psycopg[binary]" sqlalchemy

Connection from environment variables (never put the password in a file
that goes into git):
    PGHOST=aws-1-eu-west-1.pooler.supabase.com
    PGPORT=5432
    PGDATABASE=postgres
    PGUSER=analyst.rvpwquzuknwcntzosqlr
    PGPASSWORD=<analyst password>

Use:
    python analysis/export_raw.py                 # load and print a summary
    python analysis/export_raw.py --csv out_dir   # also write one CSV per table
    python analysis/export_raw.py --labels        # add *_label columns (English)

In a notebook:
    from export_raw import load_all
    t = load_all(labels=True)
    t["raw_agri_inputs"].groupby("product_type")["total_cost"].sum()
"""

import argparse
import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

HERE = Path(__file__).resolve().parent


def engine():
    url = (
        f"postgresql+psycopg://{os.environ['PGUSER']}:{os.environ['PGPASSWORD']}"
        f"@{os.environ['PGHOST']}:{os.environ.get('PGPORT', '5432')}"
        f"/{os.environ.get('PGDATABASE', 'postgres')}?sslmode=require"
    )
    return create_engine(url)


def table_names(eng) -> list[str]:
    """households_flat plus every raw_* view, found in the database itself."""
    q = text(
        "select table_name from information_schema.views "
        "where table_schema = 'public' and table_name like 'raw\\_%' order by table_name"
    )
    with eng.connect() as c:
        return ["households_flat"] + [r[0] for r in c.execute(q)]


def add_labels(tables: dict[str, pd.DataFrame]) -> None:
    """Adds <column>_label next to every coded column, using the codebook."""
    options = pd.read_csv(HERE / "codebook" / "options.csv", dtype=str)
    columns = pd.read_csv(HERE / "codebook" / "columns.csv", dtype=str)
    for _, col in columns.dropna(subset=["code_list"]).iterrows():
        df = tables.get(col["view"])
        if df is None or col["column"] not in df.columns:
            continue
        codes = options[options["list"] == col["code_list"]].set_index("code")["label_en"]
        df[col["column"] + "_label"] = df[col["column"]].map(codes)


def load_all(labels: bool = False) -> dict[str, pd.DataFrame]:
    eng = engine()
    tables = {name: pd.read_sql(f'select * from public."{name}"', eng) for name in table_names(eng)}
    if labels:
        add_labels(tables)
    return tables


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", metavar="DIR", help="write one CSV per table into DIR")
    ap.add_argument("--labels", action="store_true", help="add English labels for coded columns")
    args = ap.parse_args()

    tables = load_all(labels=args.labels)
    for name, df in tables.items():
        print(f"{name:28s} {len(df):6d} rows  {len(df.columns):3d} columns")

    if args.csv:
        out = Path(args.csv)
        out.mkdir(parents=True, exist_ok=True)
        for name, df in tables.items():
            df.to_csv(out / f"{name}.csv", index=False, encoding="utf-8-sig")
        print(f"written to {out.resolve()}")


if __name__ == "__main__":
    main()
