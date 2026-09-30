/**
 * Diagnostic: is the built bundle bootable?
 * Checks a bundle for unreplaced import.meta.env references and whether the
 * Supabase project host is baked in.
 * Usage: bun scripts/check-bundle.mjs [path-to-bundle]
 */
import { readFileSync } from "node:fs";

const FILE = process.argv[2] ?? "isolate/assets/index-DmMSE69B.js";
const PROJECT_REF = ["wnqf", "dmbypygvrdanosqx"].join("");

const js = readFileSync(FILE, "utf8");

const envRefs = js.match(/import\.meta\.env/g)?.length ?? 0;
const envKeys = [...new Set(js.match(/import\.meta\.env\.[A-Za-z_]+/g) ?? [])];
const hasProjectRef = js.includes(PROJECT_REF);

console.log(`bundle: ${FILE} (${js.length} bytes)`);
console.log(`unreplaced "import.meta.env" references: ${envRefs}`);
if (envKeys.length) console.log(`  keys referenced: ${envKeys.join(", ")}`);
console.log(`supabase project host baked in: ${hasProjectRef}`);
console.log(
  envRefs === 0 && hasProjectRef
    ? "✅ bundle is bootable (env resolved, credentials baked in)"
    : "❌ bundle will FAIL at runtime",
);
