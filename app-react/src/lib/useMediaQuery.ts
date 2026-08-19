import { useEffect, useState } from "react";

/** Ported from isPhoneLayout() in docs/js/app.js, which just checks
 *  matchMedia at render time. This subscribes to changes instead, so a
 *  rotation or resize mid-session updates the layout without needing a
 *  tab switch to re-check it. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
