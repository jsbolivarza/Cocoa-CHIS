/* sync.ts
   Upload household records to a Supabase (hosted PostgreSQL) project, so
   they can be read from Python, R and Power BI (see analysis/README.md),
   and download a coach's own uploads onto another device.

   Both directions are manual taps, never automatic. Upload sends records
   changed since their last upload. Download fetches every household the
   signed-in coach uploaded (from any device) and merges them with
   storage.mergeServerRecords(): ids are kept, and the most recently saved
   version of a household wins. Deleting a record on a device does not
   delete it on the server, so a later download brings it back.

   Plain fetch against Supabase's REST endpoints instead of supabase-js: a
   few calls (sign in, upsert, select) don't justify the dependency, and the session is
   kept in IndexedDB with everything else rather than in localStorage.

   Configuration is build-time, from app-react/.env.local:
     VITE_SUPABASE_URL=https://<project>.supabase.co
     VITE_SUPABASE_ANON_KEY=<anon public key>
   The anon key is public by design; the table's row-level security (see
   supabase/schema.sql) is what limits a coach to inserting their own rows. */

import type { HouseholdRecord } from "./dataModel";
import { db, flatRowForRecord } from "./storage";

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export function syncConfigured(): boolean {
  return !!URL_BASE && !!ANON_KEY;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. */
  expiresAt: number;
  email: string;
}

const SESSION_KEY = "sync_session";

async function loadSession(): Promise<Session | null> {
  const row = await db.kv.get(SESSION_KEY);
  return (row?.value as Session | undefined) ?? null;
}

async function saveSession(s: Session | null): Promise<void> {
  if (s) await db.kv.put({ key: SESSION_KEY, value: s });
  else await db.kv.delete(SESSION_KEY);
}

export async function signedInEmail(): Promise<string | null> {
  return (await loadSession())?.email ?? null;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: { email?: string };
}

async function tokenRequest(grant: "password" | "refresh_token", body: object): Promise<TokenResponse> {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new SyncError(res.status === 400 ? "bad_login" : "server", await res.text());
  return res.json();
}

function toSession(t: TokenResponse, email: string): Session {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + t.expires_in,
    email: t.user?.email ?? email,
  };
}

export class SyncError extends Error {
  code: "not_configured" | "not_signed_in" | "bad_login" | "offline" | "server";
  constructor(code: SyncError["code"], detail = "") {
    super(detail || code);
    this.code = code;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!syncConfigured()) throw new SyncError("not_configured");
  try {
    const t = await tokenRequest("password", { email, password });
    await saveSession(toSession(t, email));
  } catch (e) {
    throw e instanceof SyncError ? e : new SyncError("offline");
  }
}

export async function signOut(): Promise<void> {
  await saveSession(null);
}

/** A valid access token, refreshed if it expires within a minute. */
async function accessToken(): Promise<string> {
  const s = await loadSession();
  if (!s) throw new SyncError("not_signed_in");
  if (s.expiresAt - 60 > Date.now() / 1000) return s.accessToken;
  try {
    const t = await tokenRequest("refresh_token", { refresh_token: s.refreshToken });
    const next = toSession(t, s.email);
    await saveSession(next);
    return next.accessToken;
  } catch (e) {
    if (e instanceof SyncError && e.code !== "offline") {
      await saveSession(null);
      throw new SyncError("not_signed_in");
    }
    throw e instanceof SyncError ? e : new SyncError("offline");
  }
}

/** Consent rule: a record leaves the device only if the respondent agreed to
 *  release their data to Fairtrade International (Consent tab). */
export function mayUpload(r: HouseholdRecord): boolean {
  return r.consent?.releaseFI === true;
}

export interface SyncStatus {
  /** Consented and changed since the last upload (or never uploaded). */
  pending: HouseholdRecord[];
  uploaded: number;
  /** No Fairtrade International release on the Consent tab. */
  noConsent: number;
  lastUploadAt: string | null;
}

export async function syncStatus(records: Record<string, HouseholdRecord>): Promise<SyncStatus> {
  const log = new Map((await db.syncLog.toArray()).map((e) => [e.id, e]));
  const pending: HouseholdRecord[] = [];
  let uploaded = 0;
  let noConsent = 0;
  let lastUploadAt: string | null = null;
  Object.values(records).forEach((r) => {
    const entry = log.get(r.meta.id);
    if (entry && (!lastUploadAt || entry.uploadedAt > lastUploadAt)) lastUploadAt = entry.uploadedAt;
    if (!mayUpload(r)) noConsent++;
    else if (entry?.uploadedUpdatedAt === r.meta.updatedAt) uploaded++;
    else pending.push(r);
  });
  return { pending, uploaded, noConsent, lastUploadAt };
}

/** One row of public.households (supabase/schema.sql). coach_user is set by
 *  the database from the sign-in token, not sent from here. */
function toRow(r: HouseholdRecord) {
  return {
    id: r.meta.id,
    farmer_id: r.meta.farmerId,
    producer_code: r.profile.producerCode || null,
    season: r.meta.season || null,
    coop_name: r.profile.coopName || null,
    coach_name: r.profile.coachName || null,
    record_updated_at: r.meta.updatedAt,
    format_version: r.meta.formatVersion,
    app_version: __APP_VERSION__,
    record: r,
    summary: flatRowForRecord(r),
  };
}

const BATCH = 50;

/** Upserts the given records; returns how many reached the server. */
export async function uploadRecords(records: HouseholdRecord[]): Promise<number> {
  if (!syncConfigured()) throw new SyncError("not_configured");
  let done = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const token = await accessToken();
    let res: Response;
    try {
      res = await fetch(`${URL_BASE}/rest/v1/households?on_conflict=id`, {
        method: "POST",
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(batch.map(toRow)),
      });
    } catch {
      throw new SyncError("offline");
    }
    if (res.status === 401) {
      await saveSession(null);
      throw new SyncError("not_signed_in");
    }
    if (!res.ok) throw new SyncError("server", await res.text());
    const now = new Date().toISOString();
    await db.syncLog.bulkPut(batch.map((r) => ({ id: r.meta.id, uploadedUpdatedAt: r.meta.updatedAt, uploadedAt: now })));
    done += batch.length;
  }
  return done;
}

const PAGE = 200;

/** Every household this coach has uploaded, from any device. Row-level
 *  security on the server (coach_select_own in supabase/schema.sql) limits
 *  the rows to the signed-in coach's own uploads, so no filter is needed
 *  here. Paged, because the server returns at most 1000 rows per request. */
export async function downloadRecords(): Promise<HouseholdRecord[]> {
  if (!syncConfigured()) throw new SyncError("not_configured");
  const out: HouseholdRecord[] = [];
  for (let from = 0; ; from += PAGE) {
    const token = await accessToken();
    let res: Response;
    try {
      res = await fetch(`${URL_BASE}/rest/v1/households?select=record&order=id`, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
          Range: `${from}-${from + PAGE - 1}`,
          "Range-Unit": "items",
        },
      });
    } catch {
      throw new SyncError("offline");
    }
    if (res.status === 401) {
      await saveSession(null);
      throw new SyncError("not_signed_in");
    }
    if (!res.ok) throw new SyncError("server", await res.text());
    const rows = (await res.json()) as { record: HouseholdRecord }[];
    rows.forEach((row) => row.record && out.push(row.record));
    if (rows.length < PAGE) break;
  }
  return out;
}
