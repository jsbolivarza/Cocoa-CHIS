/* Shared between the step rail and the app bar's context line. Tabs join
   this list as each is rebuilt — see the migration plan for order. */
export const TABS = ["consent"] as const;
export type TabKey = (typeof TABS)[number];
export const TAB_LABEL_KEY: Record<string, string> = {
  consent: "tab_consent",
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
