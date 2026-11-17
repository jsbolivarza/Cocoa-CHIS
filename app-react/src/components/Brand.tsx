/* Brand.tsx — who made the app and what it is, on every screen:
   Fairtrade logo, the app's own icon, and the app name.

   The Fairtrade logo is a protected mark, so it is not drawn here. Drop the
   official file into src/assets/brand/ as fairtrade-logo.svg (or .png) and
   it appears automatically: the glob below finds it at build time, Vite
   fingerprints it, and the service worker precaches it for offline use.
   Without the file, the row shows the app icon and name only. */

import { useAppStore } from "../store/appStore";
import { t } from "../lib/i18n";

const logoFiles = import.meta.glob("../assets/brand/fairtrade-logo.{svg,png}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const FAIRTRADE_LOGO = Object.values(logoFiles)[0] ?? null;
const APP_ICON = `${import.meta.env.BASE_URL}icons/icon.svg`;

export function Brand({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  const lang = useAppStore((s) => s.currentLang);
  return (
    <div className={`brand brand-${tone}${compact ? " brand-compact" : ""}`}>
      {FAIRTRADE_LOGO && <img className="brand-ft" src={FAIRTRADE_LOGO} alt="Fairtrade" />}
      <img className="brand-icon" src={APP_ICON} alt="" aria-hidden="true" />
      <span className="brand-text">
        <span className="brand-name">{t("brand_name", lang)}</span>
        {!compact && <span className="brand-tag">{t("app_subtitle", lang)}</span>}
      </span>
    </div>
  );
}
