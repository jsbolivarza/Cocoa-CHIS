/* roster.ts
   Producer roster import: turns profile.producerCode from free text into a
   picklist, so a typo can no longer split one farmer into two codes. The
   code is the one identifier that holds across coaches' devices (farmerId
   does not), which is why it gets a roster and the other fields don't.

   Format (defined here; no coop roster existed yet when this was written):
   a CSV with a header row. Required column: producer_code. Optional:
   producer_name, village, coop_name. Comma or semicolon separated (Excel
   in French/Spanish locales saves with semicolons), UTF-8, quotes allowed.
   Column names are matched case-insensitively, spaces treated as "_". */

import type { RosterEntry } from "./storage";

export const ROSTER_COLUMNS = ["producer_code", "producer_name", "village", "coop_name"] as const;

export interface RosterParseResult {
  entries: RosterEntry[];
  /** Rows dropped: blank code, or a code already seen earlier in the file. */
  skipped: number;
  /** Set when the file can't be used at all (no producer_code column). */
  error: "no_code_column" | "empty" | null;
}

/** Splits CSV text into rows of cells, honouring quoted cells that contain
 *  the delimiter, doubled quotes or line breaks. */
function splitCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function headerKey(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseRosterCsv(raw: string): RosterParseResult {
  const text = raw.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = splitCsv(text, delim);
  if (rows.length < 2) return { entries: [], skipped: 0, error: "empty" };

  const header = rows[0].map(headerKey);
  const col = (name: string) => header.indexOf(name);
  const iCode = col("producer_code");
  if (iCode === -1) return { entries: [], skipped: 0, error: "no_code_column" };
  const iName = col("producer_name");
  const iVillage = col("village");
  const iCoop = col("coop_name");
  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const seen = new Set<string>();
  const entries: RosterEntry[] = [];
  let skipped = 0;
  rows.slice(1).forEach((r) => {
    const code = cell(r, iCode);
    if (!code || seen.has(code)) {
      skipped++;
      return;
    }
    seen.add(code);
    entries.push({ producerCode: code, producerName: cell(r, iName), village: cell(r, iVillage), coopName: cell(r, iCoop) });
  });
  return { entries, skipped, error: entries.length ? null : "empty" };
}

export function findRosterEntry(roster: RosterEntry[], code: string): RosterEntry | undefined {
  const c = code.trim();
  if (!c) return undefined;
  return roster.find((e) => e.producerCode === c);
}
