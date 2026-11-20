/* fields.tsx
   Controlled field components bound to a record path, replacing the vanilla
   app's renderInput()/renderSelect() string templates + event-delegation
   (data-path attributes handled by one "change" listener in app.js).

   One behavioral note: the vanilla app deliberately used the native "change"
   event (fires on blur, not per keystroke) because every edit rebuilt the
   tab's HTML from scratch via innerHTML, which would otherwise steal focus
   mid-keystroke. React reconciles the same DOM node across re-renders, so
   that workaround is not needed here — these use onChange (React's
   per-keystroke handler) and focus is preserved naturally. */

import { useAppStore } from "../store/appStore";
import { t, opt, type Lang } from "../lib/i18n";
import type { NumStr } from "../lib/dataModel";

function useUpdateField() {
  return useAppStore((s) => s.updateField);
}

export function TextField({ path, value, placeholder }: { path: string; value: string; placeholder?: string }) {
  const updateField = useUpdateField();
  return (
    <input
      type="text"
      className="field"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => updateField(path, e.target.value)}
    />
  );
}

export function DateField({ path, value }: { path: string; value: string }) {
  const updateField = useUpdateField();
  return (
    <input type="date" className="field" value={value ?? ""} onChange={(e) => updateField(path, e.target.value)} />
  );
}

/** Every number field carries a "Doesn't know" toggle. Marking one clears
 *  the value and records the path in meta.unknownFields (see dataModel.ts),
 *  so a blank caused by "doesn't know" can be told apart from a blank that
 *  was never asked. */
export function NumberField({ path, value, step = "any" }: { path: string; value: NumStr; step?: string }) {
  const updateField = useUpdateField();
  const toggleUnknown = useAppStore((s) => s.toggleUnknown);
  const lang = useAppStore((s) => s.currentLang);
  const unknown = useAppStore((s) => !!s.record?.meta.unknownFields?.includes(path));
  const dkLabel = t("dk_label", lang);
  return (
    <span className={`num-wrap${unknown ? " is-unknown" : ""}`}>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        className="field field-num"
        disabled={unknown}
        placeholder={unknown ? dkLabel : undefined}
        value={unknown || value === "" || value == null ? "" : value}
        onChange={(e) => updateField(path, e.target.value === "" ? "" : parseFloat(e.target.value))}
      />
      <button
        type="button"
        className="dk-btn"
        aria-pressed={unknown}
        aria-label={dkLabel}
        title={unknown ? t("dk_undo", lang) : dkLabel}
        onClick={(e) => {
          e.preventDefault();
          toggleUnknown(path);
        }}
      >
        ?
      </button>
    </span>
  );
}

export function CheckboxField({ path, checked, label }: { path: string; checked: boolean; label: string }) {
  const updateField = useUpdateField();
  return (
    <label className="check">
      <input type="checkbox" className="field" checked={!!checked} onChange={(e) => updateField(path, e.target.checked)} />
      {" " + label}
    </label>
  );
}

interface SelectFieldProps {
  path: string;
  value: string;
  lang: Lang;
  optionsKey?: string | null;
  staticOptions?: string[];
  /** Inside a table cell: show the chosen option as wrapping text. */
  wrap?: boolean;
}

export function SelectField({ path, value, lang, optionsKey, staticOptions, wrap }: SelectFieldProps) {
  const updateField = useUpdateField();
  const options = staticOptions
    ? staticOptions.map((k) => ({ key: k, label: t(k, lang) }))
    : opt(optionsKey || "", lang);
  const select = (
    <select
      className={`field field-select${wrap ? " select-overlay" : ""}`}
      value={value ?? ""}
      onChange={(e) => updateField(path, e.target.value)}
    >
      <option value="">{t("select_placeholder", lang)}</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!wrap) return select;
  // A dropdown can only show its choice on one line, so long options in
  // narrow table columns were cut to "cocoa int…". Here the choice is shown
  // as text that wraps onto two lines, and the real dropdown sits invisibly
  // on top of it: tapping still opens the device's own list, unchanged.
  const chosen = options.find((o) => o.key === value);
  return (
    <span className="select-wrap">
      <span className={`field select-face${chosen ? "" : " is-empty"}`} aria-hidden="true">
        {chosen ? chosen.label : t("select_placeholder", lang)}
      </span>
      {select}
    </span>
  );
}
