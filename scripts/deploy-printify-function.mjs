/**
 * KIYUMI — Deploy the printify-fulfillment Edge Function via the Supabase
 * Management API (no CLI, no Docker).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-printify-function.mjs
 *   (token also accepted from scripts/.sb_token.tmp — never printed)
 *
 * What it does:
 *   1. Deploy supabase/functions/printify-fulfillment/index.ts
 *      (POST /v1/projects/{ref}/functions/deploy?slug=printify-fulfillment,
 *      multipart: metadata + file). Idempotent: re-deploys update in place.
 *   2. Read .env.local for PRINTIFY_API_TOKEN / PRINTIFY_WEBHOOK_SECRET and
 *      create the function secrets (SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform).
 *   3. Smoke-test the deployed function (health route, no secrets printed).
 */
import { readFileSync, existsSync } from "node:fs";

const PROJECT = "wnqfdmbypygvrdanosqx";
const API = `https://api.supabase.com/v1/projects/${PROJECT}`;
const SLUG = "printify-fulfillment";

// --- token ------------------------------------------------------------------
function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const tmp = new URL("./.sb_token.tmp", import.meta.url);
  if (existsSync(tmp)) {
    return readFileSync(tmp, "utf8").trim();
  }
  console.error("Missing SUPABASE_ACCESS_TOKEN (env or scripts/.sb_token.tmp)");
  process.exit(1);
}
const TOKEN = readToken();

// --- helpers ----------------------------------------------------------------
async function mgmt(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!response.ok) {
    throw new Error(`${path} → HTTP ${response.status}: ${String(data).slice(0, 400)}`);
  }
  return data;
}

const parseEnv = () =>
  Object.fromEntries(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );

// --- 1) deploy ---------------------------------------------------------------
console.log(`1. Deploying ${SLUG} …`);
const source = readFileSync(
  new URL("../supabase/functions/printify-fulfillment/index.ts", import.meta.url),
  "utf8",
);

const form = new FormData();
form.append(
  "metadata",
  JSON.stringify({
    entrypoint_path: "index.ts",
    name: "printify-fulfillment",
    verify_jwt: false, // webhook GETs cannot carry a Supabase JWT; route-level auth instead
    import_map: false,
  }),
);
form.append("file", new Blob([source], { type: "text/typescript" }), "index.ts");

const deployRes = await mgmt(
  `/functions/deploy?slug=${SLUG}&bundleOnly=0`,
  { method: "POST", body: form },
);
console.log("   deployed:", JSON.stringify(deployRes).slice(0, 300));

// --- 2) secrets ---------------------------------------------------------------
console.log("2. Setting function secrets …");
const env = parseEnv();
const token = env.PRINTIFY_API_TOKEN ?? "";
const webhookSecret = env.PRINTIFY_WEBHOOK_SECRET ?? "";
const brevoKey = env.BREVO_API_KEY ?? "";
const mailFrom = env.MAIL_FROM ?? "";
const qikinkClientId = env.QIKINK_CLIENT_ID ?? "";
const qikinkClientSecret = env.QIKINK_CLIENT_SECRET ?? "";
const qikinkBaseUrl = env.QIKINK_BASE_URL ?? "";
const qikinkWebhookSecret = env.QIKINK_WEBHOOK_SECRET ?? "";
if (!token) console.error("   ! PRINTIFY_API_TOKEN missing in .env.local — secret not set");

const secretsBody = [];
if (token) secretsBody.push({ name: "PRINTIFY_API_TOKEN", value: token });
if (webhookSecret) secretsBody.push({ name: "PRINTIFY_WEBHOOK_SECRET", value: webhookSecret });
if (brevoKey) secretsBody.push({ name: "BREVO_API_KEY", value: brevoKey });
if (mailFrom) secretsBody.push({ name: "MAIL_FROM", value: mailFrom });
if (qikinkClientId) secretsBody.push({ name: "QIKINK_CLIENT_ID", value: qikinkClientId });
if (qikinkClientSecret) secretsBody.push({ name: "QIKINK_CLIENT_SECRET", value: qikinkClientSecret });
if (qikinkBaseUrl) secretsBody.push({ name: "QIKINK_BASE_URL", value: qikinkBaseUrl });
if (qikinkWebhookSecret) secretsBody.push({ name: "QIKINK_WEBHOOK_SECRET", value: qikinkWebhookSecret });
if (secretsBody.length) {
  await mgmt("/secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(secretsBody),
  });
  console.log(`   set ${secretsBody.length} secret(s): ${secretsBody.map((s) => s.name).join(", ")}`);
}

// --- 3) smoke test -------------------------------------------------------------
console.log("3. Smoke-testing …");
await new Promise((r) => setTimeout(r, 4000));
const health = await fetch(`https://${PROJECT}.supabase.co/functions/v1/${SLUG}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY ?? ""}`,
    apikey: env.VITE_SUPABASE_ANON_KEY ?? "",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ route: "health" }),
});
const healthBody = await health.text();
console.log(`   health → HTTP ${health.status}: ${healthBody.slice(0, 400)}`);
