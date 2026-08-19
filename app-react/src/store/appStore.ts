/* appStore.ts
   Global app state via Zustand — the React equivalent of the vanilla app's
   module-level `let record`, `let records`, `let screen`, etc. in app.js.
   One store instead of scattered globals, but the same shape of state. */

import { create } from "zustand";
import type { HouseholdRecord } from "../lib/dataModel";
import { emptyRecord } from "../lib/dataModel";
import * as storage from "../lib/storage";
import type { Lang } from "../lib/i18n";
import { setPathImmutable } from "../lib/paths";
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

  switchTab: (tab) => set({ currentTab: tab }),
  switchListTab: (tab) => set({ listTab: tab }),

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
}));
