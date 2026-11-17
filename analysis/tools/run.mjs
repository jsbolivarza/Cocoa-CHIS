// Regenerates supabase/raw_views.sql and analysis/codebook/*.csv from the
// app's current data model (see build.mts). Run after any change to the
// record format:   node analysis/tools/run.mjs
// Then re-run supabase/raw_views.sql in the Supabase SQL Editor.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const libSrc = resolve(here, "../../app-react/src/lib");
const libDst = join(here, "_lib");
mkdirSync(libDst, { recursive: true });

for (const name of ["i18n", "dataModel", "calc"]) {
  const src = readFileSync(join(libSrc, `${name}.ts`), "utf8");
  const patched = src.replace(/from "\.\/(i18n|dataModel|calc)"/g, 'from "./$1.ts"');
  writeFileSync(join(libDst, `${name}.ts`), patched);
}

const res = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join(here, "build.mts")], {
  stdio: "inherit",
});
process.exit(res.status ?? 1);
