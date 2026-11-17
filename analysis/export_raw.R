# export_raw.R: load every household table from Supabase into R,
# optionally write them all to CSV. Same tables as export_raw.py:
#   households_flat, raw_<table> (one row per table row / month),
#   raw_expenditures, raw_unknown_answers. Join on household_id.
# Codes are explained in analysis/codebook/options.csv and columns.csv.
#
# Setup (once):
#   install.packages(c("DBI", "RPostgres"))
#
# Create it from RStudio with file.edit("~/.Renviron") (on Windows that is
# Documents\.Renviron), end the last line with Enter, then Session >
# Restart R. Check: Sys.getenv("PGUSER").
#
# Connection from environment variables, e.g. in ~/.Renviron (never in a
# file that goes into git):
#   PGHOST=aws-1-eu-west-1.pooler.supabase.com
#   PGPORT=5432
#   PGDATABASE=postgres
#   PGUSER=analyst.rvpwquzuknwcntzosqlr
#   PGPASSWORD=<analyst password>
#
# Use:
#   Rscript analysis/export_raw.R                 # load and print a summary
#   Rscript analysis/export_raw.R out_dir         # also write one CSV per table
# Or in RStudio:
#   source("analysis/export_raw.R"); t <- load_all(labels = TRUE)
#   aggregate(total_cost ~ product_type_label, t$raw_agri_inputs, sum)

library(DBI)

# Finds analysis/codebook whether this file is run with Rscript, source()d
# from another script or notebook, or the codebook is elsewhere
# (set COCOA_CODEBOOK to its folder).
codebook_dir <- local({
  sourced <- tryCatch(sys.frame(1)$ofile, error = function(e) NULL)  # set by source()
  args <- commandArgs(trailingOnly = FALSE)
  rscript <- sub("^--file=", "", args[grep("^--file=", args)])
  candidates <- c(
    Sys.getenv("COCOA_CODEBOOK"),
    if (!is.null(sourced)) file.path(dirname(normalizePath(sourced)), "codebook"),
    if (length(rscript)) file.path(dirname(normalizePath(rscript)), "codebook"),
    file.path("analysis", "codebook"),
    "codebook"
  )
  candidates <- candidates[nzchar(candidates)]
  found <- candidates[file.exists(file.path(candidates, "options.csv"))]
  if (length(found)) found[1] else candidates[length(candidates)]
})

table_names <- function(con) {
  views <- dbGetQuery(con, "
    select table_name from information_schema.views
    where table_schema = 'public' and table_name like 'raw\\_%'
    order by table_name")$table_name
  c("households_flat", views)
}

add_labels <- function(tables) {
  options <- read.csv(file.path(codebook_dir, "options.csv"), colClasses = "character", encoding = "UTF-8")
  columns <- read.csv(file.path(codebook_dir, "columns.csv"), colClasses = "character", encoding = "UTF-8")
  columns <- columns[columns$code_list != "", ]
  for (i in seq_len(nrow(columns))) {
    v <- columns$view[i]; col <- columns$column[i]
    if (is.null(tables[[v]]) || !(col %in% names(tables[[v]]))) next
    codes <- options[options$list == columns$code_list[i], ]
    tables[[v]][[paste0(col, "_label")]] <- codes$label_en[match(tables[[v]][[col]], codes$code)]
  }
  tables
}

load_all <- function(labels = FALSE) {
  con <- dbConnect(RPostgres::Postgres(), sslmode = "require")  # reads the PG* variables
  on.exit(dbDisconnect(con))
  names <- table_names(con)
  tables <- setNames(lapply(names, function(n) dbGetQuery(con, sprintf('select * from public."%s"', n))), names)
  if (labels) tables <- add_labels(tables)
  tables
}

if (sys.nframe() == 0) {
  args <- commandArgs(trailingOnly = TRUE)
  tables <- load_all(labels = TRUE)
  for (n in names(tables)) cat(sprintf("%-28s %6d rows %4d columns\n", n, nrow(tables[[n]]), ncol(tables[[n]])))
  if (length(args)) {
    dir.create(args[1], showWarnings = FALSE, recursive = TRUE)
    for (n in names(tables)) write.csv(tables[[n]], file.path(args[1], paste0(n, ".csv")), row.names = FALSE, fileEncoding = "UTF-8")
    cat("written to", normalizePath(args[1]), "\n")
  }
}
