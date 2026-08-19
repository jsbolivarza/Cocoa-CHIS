/* ConsentTab.tsx
   Ported from renderConsentTab() in docs/js/app.js. First tab rebuilt as a
   proof of concept for the migration: no repeating tables, just fields and
   checkboxes, which is why it went first. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";
import { TextField, DateField, SelectField, CheckboxField } from "./fields";

export function ConsentTab() {
  const record = useAppStore((s) => s.record);
  const lang = useAppStore((s) => s.currentLang);
  if (!record) return null;
  const c = record.consent;
  const bodyParagraphs = t("consent_body", lang).split("\n\n");

  return (
    <div className="panel">
      <h2>{t("consent_heading", lang)}</h2>
      <div className="consent-text">
        {bodyParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <hr />
      <h3>{t("consent_title", lang)}</h3>
      <div className="form-grid">
        <label>
          {t("consent_respondent_name", lang)}
          <TextField path="consent.respondentName" value={c.respondentName} />
        </label>
        <label>
          {t("consent_date", lang)}
          <DateField path="consent.date" value={c.date} />
        </label>
      </div>
      <p className="section-help">{t("consent_release_to", lang)}</p>
      <div className="checkbox-row">
        <CheckboxField path="consent.releaseFI" checked={c.releaseFI} label={t("consent_release_fi", lang)} />
        <CheckboxField path="consent.releaseCoop" checked={c.releaseCoop} label={t("consent_release_coop", lang)} />
        <CheckboxField path="consent.releasePN" checked={c.releasePN} label={t("consent_release_pn", lang)} />
        <CheckboxField path="consent.releaseBuyers" checked={c.releaseBuyers} label={t("consent_release_buyers", lang)} />
      </div>
      <div className="form-grid">
        <label>
          {t("consent_oral", lang)}
          <SelectField path="consent.oralConsent" value={c.oralConsent} lang={lang} staticOptions={["yes", "no"]} />
        </label>
        <label>
          {t("consent_explanation", lang)}
          <TextField path="consent.explanation" value={c.explanation} />
        </label>
      </div>
      <div className="table-actions">
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          {t("btn_print_consent", lang)}
        </button>
      </div>
    </div>
  );
}
