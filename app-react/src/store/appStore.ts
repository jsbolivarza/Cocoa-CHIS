/* appStore.ts
   Global app state via Zustand — the React equivalent of the vanilla app's
   module-level `let record`, `let records`, `let screen`, etc. in app.js.
   One store instead of scattered globals, but the same shape of state. */

import { create } from "zustand";
import type { HouseholdRecord, TableRow } from "../lib/dataModel";
import { emptyRecord, emptyRow, TABLE_SCHEMAS } from "../lib/dataModel";
import * as storage from "../lib/storage";
import { t, type Lang } from "../lib/i18n";
import { getPath, setPathImmutable } from "../lib/paths";
import type { ListTab } from "../lib/tabs";

export type Screen = "list" | "editor";
export type SaveStatus = "saved" | "saving";

interface ConfirmRequest {
  message: string;
  onConfirm: () => void;
}

interface AppState {
  records: Record<string, HouseholdRecord>;
  currentRecordId: string | null;
  record: HouseholdRecord | null;
  screen: Screen;
  currentTab: string;
  listTab: ListTab;
  currentLang: Lang;
  saveStatus: SaveStatus;
  loaded: boolean;
  confirmRequest: ConfirmRequest | null;
  // In memory only, like the vanilla app: a search that survived a restart
  // would hide records with no visible reason why. Lives in the store (not
  // component state) because the search box renders in the header bar while
  // the results it filters render in the records screen below it.
  recordSearch: string;

  init: () => Promise<void>;
  setLang: (lang: Lang) => void;
  createRecord: () => Promise<void>;
  openRecord: (id: string) => void;
  goToList: () => void;
  deleteRecordById: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  switchTab: (tab: string) => void;
  switchListTab: (tab: ListTab) => void;
  updateField: (path: string, value: unknown) => void;
  addRow: (schemaKey: string, arrPath: string) => void;
  removeRow: (arrPath: string, idx: number) => void;
  toggleStepComplete: (tab: string) => void;
  askConfirm: (message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;
  setRecordSearch: (v: string) => void;
}

// Module-level, like the vanilla app's saveTimer — one debounce in flight at
// a time is the whole point, so it does not belong inside the store's state.
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  records: {},
  currentRecordId: null,
  record: null,
  screen: "list",
  currentTab: "consent",
  listTab: "records",
  currentLang: ((storage.loadLangPref() as Lang) || "en"),
  saveStatus: "saved",
  loaded: false,
  confirmRequest: null,
  recordSearch: "",

  init: async () => {
    const records = await storage.loadAllRecords();
    set({ records, loaded: true });
  },

  setLang: (lang) => {
    storage.saveLangPref(lang);
    set({ currentLang: lang });
  },

  createRecord: async () => {
    const rec = emptyRecord();
    rec.meta.language = get().currentLang;
    await storage.saveRecord(rec);
    set((s) => ({
      records: { ...s.records, [rec.meta.id]: rec },
      currentRecordId: rec.meta.id,
      record: rec,
      screen: "editor",
      currentTab: "consent",
    }));
  },

  openRecord: (id) => {
    const rec = get().records[id];
    if (!rec) return;
    set({ currentRecordId: id, record: rec, screen: "editor", currentTab: "consent" });
  },

  goToList: () => set({ screen: "list", currentRecordId: null, record: null }),

  deleteRecordById: async (id) => {
    await storage.deleteRecord(id);
    set((s) => {
      const records = { ...s.records };
      delete records[id];
      const closingCurrent = s.currentRecordId === id;
      return closingCurrent
        ? { records, screen: "list", currentRecordId: null, record: null }
        : { records };
    });
  },

  clearAll: async () => {
    await storage.clearAllRecords();
    set({
      records: {},
      currentRecordId: null,
      record: null,
      screen: "list",
      listTab: "records",
      recordSearch: "",
    });
  },

  // Ported from switchTab()/switchListTab() in docs/js/app.js, which scroll
  // to the top on every tab change so a step opened mid-scroll on the
  // previous one doesn't land the user in the middle of the new one.
  switchTab: (tab) => {
    set({ currentTab: tab });
    window.scrollTo(0, 0);
  },
  switchListTab: (tab) => {
    set({ listTab: tab });
    window.scrollTo(0, 0);
  },

  askConfirm: (message, onConfirm) => set({ confirmRequest: { message, onConfirm } }),
  closeConfirm: () => set({ confirmRequest: null }),
  setRecordSearch: (v) => set({ recordSearch: v }),

  updateField: (path, value) => {
    const current = get().record;
    if (!current) return;
    const updated = setPathImmutable(current, path, value);
    set((s) => ({
      record: updated,
      records: { ...s.records, [updated.meta.id]: updated },
      saveStatus: "saving",
    }));
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      storage.saveRecord(updated).then(() => {
        // Guards against a stale timer landing after the record was closed
        // or replaced by another edit's own timer.
        if (get().currentRecordId === updated.meta.id) set({ saveStatus: "saved" });
      });
    }, 400);
  },

  // Ported from doAddRow()/doRemoveRow() in docs/js/app.js. Removal asks for
  // confirmation there via showConfirmModal(); this reuses the same
  // ConfirmModal/askConfirm plumbing the rest of the shell already has.
  addRow: (schemaKey, arrPath) => {
    const current = get().record;
    if (!current) return;
    const schema = TABLE_SCHEMAS[schemaKey];
    const rows = (getPath<TableRow[]>(current, arrPath) || []).slice();
    rows.push(emptyRow(schema.columns));
    get().updateField(arrPath, rows);
  },
  removeRow: (arrPath, idx) => {
    get().askConfirm(t("confirm_remove_row", get().currentLang), () => {
      const current = get().record;
      if (!current) return;
      const rows = (getPath<TableRow[]>(current, arrPath) || []).slice();
      rows.splice(idx, 1);
      get().updateField(arrPath, rows);
    });
  },

  // Ported from toggleStepComplete() in docs/js/app.js. Kept on the record
  // (meta.completedSteps) rather than derived, since nothing in this form is
  // strictly required — completion is an explicit act, not inferred.
  toggleStepComplete: (tab) => {
    const current = get().record;
    if (!current) return;
    const done = Array.isArray(current.meta.completedSteps) ? current.meta.completedSteps : [];
    const next = done.includes(tab) ? done.filter((d) => d !== tab) : [...done, tab];
    get().updateField("meta.completedSteps", next);
  },
}));
