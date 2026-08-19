/* StepFooter.tsx
   Ported from renderStepFooter() in docs/js/app.js. Rendered after the tab's
   own content, inside #tab-content — not a separate shell element — so it
   is the same across every tab without each one having to know it exists. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { TABS } from "../lib/tabs";
import { StepIcon } from "./StepIcon";

export function StepFooter() {
  const record = useAppStore((s) => s.record);
  const currentTab = useAppStore((s) => s.currentTab);
  const currentLang = useAppStore((s) => s.currentLang);
  const switchTab = useAppStore((s) => s.switchTab);
  const toggleStepComplete = useAppStore((s) => s.toggleStepComplete);
  if (!record) return null;

  const idx = TABS.indexOf(currentTab as (typeof TABS)[number]);
  const done = Array.isArray(record.meta.completedSteps) ? record.meta.completedSteps : [];
  const isDone = done.includes(currentTab);

  return (
    <div className="step-footer">
      <div className="step-footer-actions">
        <button
          type="button"
          className={`btn btn-complete ${isDone ? "is-done" : ""}`}
          onClick={() => toggleStepComplete(currentTab)}
        >
          <span className="step-icon" aria-hidden="true">
            <StepIcon state={isDone ? "complete" : "empty"} />
          </span>
          {t(isDone ? "step_marked_complete" : "step_mark_complete", currentLang)}
        </button>
        {idx > 0 && (
          <button type="button" className="btn" onClick={() => switchTab(TABS[idx - 1])}>
            {t("step_back", currentLang)}
          </button>
        )}
        {idx < TABS.length - 1 && (
          <button type="button" className="btn btn-secondary" onClick={() => switchTab(TABS[idx + 1])}>
            {t("step_next", currentLang)}
          </button>
        )}
      </div>
    </div>
  );
}
