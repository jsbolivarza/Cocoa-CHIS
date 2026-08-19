/* Shared between the step rail and the app bar's context line. This is
   navigation order, matching vanilla's TABS (consent, profile, revenues,
   costs, labour, expenditures, results) — NOT build order (see the
   migration plan for that: expenditures was built before profile since it
   had no repeating tables). Tabs are inserted here at their real position
   as each is rebuilt, so expenditures stays last even though it arrived
   first. */
export const TABS = ["consent", "profile", "revenues", "costs", "labour", "expenditures", "results"] as const;
export type TabKey = (typeof TABS)[number];
export const TAB_LABEL_KEY: Record<string, string> = {
  consent: "tab_consent",
  expenditures: "tab_expenditures",
  profile: "tab_profile",
  costs: "tab_costs",
  revenues: "tab_revenues",
  labour: "tab_labour",
  results: "tab_results",
};

/** Which part of the record each step owns, used by the rail to tell an
 *  untouched step from one someone has started. Ported from TAB_SECTION in
 *  docs/js/app.js — "results" is computed rather than captured, so it maps
 *  to null, same as there, and never shows as in progress. */
export const TAB_SECTION: Record<string, string | null> = {
  consent: "consent",
  expenditures: "expenditures",
  profile: "profile",
  costs: "costs",
  revenues: "revenues",
  labour: "labour",
  results: null,
};

export type ListTab = "records" | "compare" | "export" | "settings";
export const LIST_TABS: ListTab[] = ["records", "compare", "export", "settings"];
// Full labels for the top nav (desktop). Short forms exist in i18n for a
// future bottom nav on phones (nav_records, nav_compare, ...), same split
// as the vanilla app's LIST_TAB_LABEL_KEY vs LIST_TAB_SHORT_KEY.
export const LIST_TAB_LABEL_KEY: Record<ListTab, string> = {
  records: "tab_list_records",
  compare: "tab_list_compare",
  export: "tab_list_export",
  settings: "tab_list_settings",
};
// Short forms for the phone bottom nav (BottomNav.tsx), matching
// LIST_TAB_SHORT_KEY in docs/js/app.js.
export const LIST_TAB_SHORT_KEY: Record<ListTab, string> = {
  records: "nav_records",
  compare: "nav_compare",
  export: "nav_export",
  settings: "nav_settings",
};
