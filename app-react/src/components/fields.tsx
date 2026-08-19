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

export function NumberField({ path, value, step = "any" }: { path: string; value: NumStr; step?: string }) {
  const updateField = useUpdateField();
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      className="field field-num"
      value={value === "" || value == null ? "" : value}
      onChange={(e) => updateField(path, e.target.value === "" ? "" : parseFloat(e.target.value))}
    />
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
}

export function SelectField({ path, value, lang, optionsKey, staticOptions }: SelectFieldProps) {
  const updateField = useUpdateField();
  const options = staticOptions
    ? staticOptions.map((k) => ({ key: k, label: t(k, lang) }))
    : opt(optionsKey || "", lang);
  return (
    <select className="field field-select" value={value ?? ""} onChange={(e) => updateField(path, e.target.value)}>
      <option value="">{t("select_placeholder", lang)}</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
