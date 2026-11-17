// Generates fake test households in the app's own record format, for
// demos and for testing Import JSON -> Upload -> Supabase -> Power BI.
//
//   node analysis/test-data/run.mjs [output.json]
//
// Default output: analysis/test-data/cocoa_test_50_households.json
// (git-ignored). Import it in the app via Settings > Import JSON.
//
// It always uses the app's CURRENT data model and calculations: the three
// files below are copied from app-react/src/lib into _lib/ (git-ignored)
// with their imports rewritten so Node can run them directly
// (--experimental-strip-types needs explicit .ts extensions). What gets
// generated is described at the top of generate.mts: 50 records, 34 farmers
// (16 with two seasons), 4 coops, XOF / hectare / kg, fixed random seed.
//
// Test data only. Every record has the Fairtrade International consent
// ticked, so all of them upload; delete them from the device and from
// Supabase before real data is captured.

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

const out = resolve(process.argv[2] ?? join(here, "cocoa_test_50_households.json"));
const res = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join(here, "generate.mts"), out], {
  stdio: "inherit",
});
if (res.status === 0) console.log(`written: ${out}`);
process.exit(res.status ?? 1);
