// KIYUMI — Printify fulfillment Edge Function (Deno)
// ===================================================
// Single-file port of the Python fulfillment backend (api/printify_client.py,
// api/printify_service.py, api/supabase_db.py, api/app.py). Runs on Supabase
// Edge Functions so it deploys on the same platform as the storefront's
// database and auth — no separate server required.
//
// Env (function secrets):
//   PRINTIFY_API_TOKEN         Personal access token (Bearer)
//   PRINTIFY_SHOP_ID           Default shop id (falls back to first shop)
//   SUPABASE_URL               Project URL (auto-injected by the platform)
//   SUPABASE_SERVICE_ROLE_KEY  Service role key (auto-injected)
//   ADMIN_EMAIL                Admin allowlist email
//   PRINTIFY_WEBHOOK_SECRET    Secret carried in the webhook URL query
//   QIKINK_CLIENT_ID           Qikink Open API client id
//   QIKINK_CLIENT_SECRET       Qikink Open API client secret (server-only)
//   QIKINK_BASE_URL            Default https://api.qikink.com (live)
//   QIKINK_WEBHOOK_SECRET      Secret carried in the Qikink webhook URL query
//   BREVO_API_KEY              Brevo SMTP API key (xkeysib-…); emails are
//                              skipped when unset, never fail orders
//   MAIL_FROM                  Verified sender, e.g. "KIYUMI <orders@kiyumi.online>"
//
// POST /functions/v1/printify-fulfillment  (JSON body; `route` field picks op)
//   health · catalog.blueprints · catalog.providers · catalog.variants
//   products.createAop · shipping.quote · orders.create
//   orders.sendToProduction · webhooks.register
//   qikink.retry · qikink.syncStatus · db.qikinkOrders
//   Admin ops require Authorization: Bearer <supabase access token> of the
//   admin email; webhook registration writes the secret query param itself.
// GET  /functions/v1/printify-fulfillment/webhook?secret=...&order_id=...
//   Shipment webhook target for Printify (Printify cannot send auth headers,
//   so the secret rides in the registered URL).
// GET  /functions/v1/printify-fulfillment/qikink/webhook?token=...
//   Qikink fulfillment webhook target (paste into the Qikink dashboard).
// GET  /functions/v1/printify-fulfillment → health.

const PRINTIFY_BASE = "https://api.printify.com/v1";
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 800;

const DEFAULT_BLUEPRINT_ID = 281; // Unisex Cut & Sew Tee (AOP)
const DEFAULT_PRINT_PROVIDER_ID = 10; // MWW On Demand

const AOP_POSITIONS = ["back", "front", "left_sleeve", "right_sleeve"];
const REQUIRED_ZIP_COUNTRIES = new Set(["US", "CA", "GB", "AU", "IN", "DE", "FR"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------------------------------------------------------------------------
// Email (Resend) — best-effort, never blocks order flow
// ---------------------------------------------------------------------------

const MAIL_FROM = () => Deno.env.get("MAIL_FROM")?.trim() ?? "";
const STORE_URL = "https://kiyumi.online";

// Parse "KIYUMI <orders@kiyumi.online>" → { name, email } for Brevo's
// structured sender object.
function parseFrom(): { name: string; email: string } | null {
  const raw = MAIL_FROM();
  const match = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1] || "KIYUMI", email: match[2].trim() };
  if (raw.includes("@")) return { name: "KIYUMI", email: raw };
  return null;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("BREVO_API_KEY")?.trim();
  const from = parseFrom();
  if (!key || !from) {
    console.log(
      "email skipped (BREVO_API_KEY or MAIL_FROM not set):",
      subject,
      "→",
      to,
    );
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("Brevo send failed:", res.status, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo network error:", err instanceof Error ? err.message : err);
    return false;
  }
}

const emailShell = (title: string, inner: string) => `
<div style="background:#0A0A0A;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#161219;border:1px solid #333;">
    <div style="padding:24px 28px;border-bottom:1px solid #2a2a2a;">
      <span style="font-size:22px;font-weight:900;letter-spacing:1px;color:#F5F5F5;">KIYUMI</span>
      <span style="color:#6b21a8;font-size:22px;font-weight:900;">.</span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 18px;font-size:16px;letter-spacing:2px;color:#F5F5F5;text-transform:uppercase;">${title}</h1>
      ${inner}
    </div>
    <div style="padding:18px 28px;border-top:1px solid #2a2a2a;color:#888;font-size:11px;">
      KIYUMI — Digital Flagship · <a href="${STORE_URL}" style="color:#dfb7ff;">kiyumi.online</a>
    </div>
  </div>
</div>`;

const fmtMoney = (cents: number, currency: string) => {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
};

async function sendOrderConfirmationEmail(order: {
  id: string;
  customer_email: string;
  customer_name: string;
  items: Array<{ name?: string; sku?: string; size?: string; quantity?: number; unit_price_cents?: number }>;
  subtotal_cents: number;
  currency: string;
}) {
  const rows = (order.items ?? [])
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;color:#e9dfeb;font-size:13px;">${i.name ?? i.sku ?? "Item"}${i.size ? ` · ${i.size}` : ""} × ${i.quantity ?? 1}</td>
        <td style="padding:8px 0;color:#F5F5F5;font-size:13px;text-align:right;">${fmtMoney(Number(i.unit_price_cents ?? 0) * Number(i.quantity ?? 1), order.currency)}</td>
      </tr>`,
    )
    .join("");
  const html = emailShell(
    "Order confirmed",
    `<p style="color:#cfc2d4;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Thanks ${order.customer_name || "friend"} — your order is in.
    </p>
    <p style="color:#888;font-size:11px;letter-spacing:1px;margin:0 0 6px;">ORDER</p>
    <p style="color:#dfb7ff;font-size:14px;font-family:monospace;margin:0 0 18px;">${order.id}</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #2a2a2a;">${rows}
      <tr>
        <td style="padding:12px 0;border-top:1px solid #2a2a2a;color:#F5F5F5;font-weight:bold;font-size:13px;">TOTAL</td>
        <td style="padding:12px 0;border-top:1px solid #2a2a2a;color:#F5F5F5;font-weight:bold;font-size:13px;text-align:right;">${fmtMoney(order.subtotal_cents, order.currency)}</td>
      </tr>
    </table>
    <p style="color:#cfc2d4;font-size:13px;line-height:1.6;margin:18px 0 0;">
      Every KIYUMI piece is made to order — production starts right away and we'll email you tracking as soon as it ships.
    </p>`,
  );
  return sendEmail(
    order.customer_email,
    `Order confirmed — KIYUMI (${order.id.slice(0, 8).toUpperCase()})`,
    html,
  );
}

async function sendShippingEmail(input: {
  email: string;
  name: string;
  orderId: string;
  trackingNumber: string;
  trackingUrl: string | null;
  carrier: string | null;
}) {
  const trackLink = input.trackingUrl
    ? `<a href="${input.trackingUrl}" style="display:inline-block;margin-top:16px;background:#6b21a8;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:12px;letter-spacing:2px;font-weight:bold;">TRACK PACKAGE</a>`
    : "";
  const html = emailShell(
    "Your order has shipped",
    `<p style="color:#cfc2d4;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Good news ${input.name || ""} — order <span style="color:#dfb7ff;font-family:monospace;">${input.orderId}</span> is on its way.
    </p>
    <p style="color:#e9dfeb;font-size:14px;margin:0 0 6px;">
      Carrier: <strong>${input.carrier ?? "Courier"}</strong>
    </p>
    <p style="color:#e9dfeb;font-size:14px;margin:0;font-family:monospace;">
      Tracking: ${input.trackingNumber}
    </p>
    ${trackLink}`, 
  );
  return sendEmail(input.email, `Your KIYUMI order has shipped 📦`, html);
}

const errorResponse = (message: string, status: number, extra?: Record<string, unknown>) =>
  json({ error: message, ...extra }, status);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Printify client (port of printify_client.py)
// ---------------------------------------------------------------------------

class PrintifyError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "PrintifyError";
    this.status = status;
  }
}

async function printifyRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const token = Deno.env.get("PRINTIFY_API_TOKEN")?.trim();
  if (!token) {
    throw new PrintifyError("PRINTIFY_API_TOKEN is not set in function secrets.", null);
  }

  const url = `${PRINTIFY_BASE}${path}`;
  let lastError = "unknown error";
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "kiyumi-fulfillment/1.0",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      lastStatus = response.status;
      const text = await response.text();

      if (response.ok) {
        return text ? JSON.parse(text) : {};
      }

      let payload: unknown = text.slice(0, 500);
      try {
        payload = JSON.parse(text);
      } catch {
        /* keep text */
      }
      lastError =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as Record<string, unknown>).message)
          : String(payload).slice(0, 300);

      if ([429, 500, 502, 503, 504].includes(response.status) && attempt <= MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
      break;
    } catch (err) {
      lastError = `network error: ${err instanceof Error ? err.message : String(err)}`;
      if (attempt <= MAX_RETRIES) await sleep(RETRY_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  throw new PrintifyError(
    `Printify ${method} ${path} failed (HTTP ${lastStatus}): ${lastError}`,
    lastStatus,
  );
}

// ---------------------------------------------------------------------------
// Qikink POD client (Open API, live: https://api.qikink.com)
//   POST /api/token        (form-urlencoded: ClientId, client_secret) → { Accesstoken }
//   POST /api/order/create (headers: ClientId, Accesstoken) → { order_id, ... }
//   GET  /api/order        (full order list — source for status/tracking sync)
// ---------------------------------------------------------------------------

const QIKINK_BASE_URL = () =>
  (Deno.env.get("QIKINK_BASE_URL") ?? "https://api.qikink.com").replace(/\/+$/, "");

class QikinkError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "QikinkError";
    this.status = status;
  }
}

let qikinkTokenCache: { token: string; fetchedAt: number } | null = null;
const QIKINK_TOKEN_TTL_MS = 20 * 60 * 60 * 1000; // refresh well before a 24h expiry

async function qikinkGetToken(force = false): Promise<string> {
  const clientId = Deno.env.get("QIKINK_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("QIKINK_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    throw new QikinkError(
      "QIKINK_CLIENT_ID / QIKINK_CLIENT_SECRET are not set in function secrets.",
    );
  }
  if (!force && qikinkTokenCache && Date.now() - qikinkTokenCache.fetchedAt < QIKINK_TOKEN_TTL_MS) {
    return qikinkTokenCache.token;
  }
  const params = new URLSearchParams({ ClientId: clientId, client_secret: clientSecret });
  const response = await fetch(`${QIKINK_BASE_URL()}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* non-json error body */
  }
  const token = typeof data.Accesstoken === "string" ? data.Accesstoken : null;
  if (!response.ok || !token) {
    throw new QikinkError(
      `Qikink token request failed (HTTP ${response.status}): ${text.slice(0, 200)}`,
      response.status,
    );
  }
  qikinkTokenCache = { token, fetchedAt: Date.now() };
  return token;
}

async function qikinkAttempt(method: string, path: string, token: string, body?: unknown) {
  const clientId = Deno.env.get("QIKINK_CLIENT_ID")?.trim() ?? "";
  const response = await fetch(`${QIKINK_BASE_URL()}${path}`, {
    method,
    headers: { ClientId: clientId, Accesstoken: token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = text.slice(0, 300);
  }
  return { ok: response.ok, status: response.status, payload };
}

async function qikinkRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  let token = await qikinkGetToken();
  let result = await qikinkAttempt(method, path, token, body);
  if (result.status === 401) {
    token = await qikinkGetToken(true); // expired → force refresh, single retry
    result = await qikinkAttempt(method, path, token, body);
  }
  if (!result.ok) {
    const message =
      result.payload && typeof result.payload === "object" && "message" in result.payload
        ? String((result.payload as Record<string, unknown>).message)
        : String(result.payload).slice(0, 200);
    throw new QikinkError(
      `Qikink ${method} ${path} failed (HTTP ${result.status}): ${message}`,
      result.status,
    );
  }
  return result.payload;
}

// ---------------------------------------------------------------------------
// Shops / catalog
// ---------------------------------------------------------------------------

const listShops = () => printifyRequest("GET", "/shops.json");

async function resolveShopId(explicit?: string): Promise<string> {
  const candidate = (explicit ?? Deno.env.get("PRINTIFY_SHOP_ID") ?? "").trim();
  if (candidate) return candidate;
  const shops = (await listShops()) as Array<{ id: string | number }>;
  if (!shops.length) throw new PrintifyError("No Printify shops available for this token.");
  return String(shops[0].id);
}

const listBlueprints = () => printifyRequest("GET", "/catalog/blueprints.json");
const listPrintProviders = (bp: number) =>
  printifyRequest("GET", `/catalog/blueprints/${bp}/print_providers.json`);
const listVariants = (bp: number, pp: number) =>
  printifyRequest("GET", `/catalog/blueprints/${bp}/print_providers/${pp}/variants.json`);

// ---------------------------------------------------------------------------
// AOP print-area builder (port of build_aop_print_areas)
// ---------------------------------------------------------------------------

interface RawVariant {
  id: number;
  title?: string;
  options?: Record<string, unknown>;
  placeholders?: Array<{ position: string; width: number; height: number }>;
}

function buildAopPrintAreas(
  imageId: string,
  variantsPayload: { variants?: RawVariant[] },
  patternFill = true,
): Array<{ variant_ids: number[]; placeholders: unknown[] }> {
  const rawVariants = variantsPayload.variants ?? [];
  if (!rawVariants.length) {
    throw new PrintifyError("Blueprint/provider has no variants — cannot build AOP print areas.");
  }

  const dimsBySize = new Map<string, Map<string, { width: number; height: number }>>();
  for (const variant of rawVariants) {
    const size = String(variant.options?.size ?? "default");
    for (const ph of variant.placeholders ?? []) {
      if (!AOP_POSITIONS.includes(ph.position)) continue;
      if (!dimsBySize.has(size)) dimsBySize.set(size, new Map());
      dimsBySize
        .get(size)!
        .set(ph.position, { width: Number(ph.width), height: Number(ph.height) });
    }
  }

  const sizeByVariant = new Map<number, string>(
    rawVariants.map((v) => [v.id, String(v.options?.size ?? "")]),
  );

  const areasBySize = new Map<string, { variant_ids: number[]; placeholders: unknown[] }>();
  for (const [size, positions] of dimsBySize) {
    const placeholders: unknown[] = [];
    for (const position of AOP_POSITIONS) {
      const dims = positions.get(position);
      if (!dims) continue;
      placeholders.push({
        position,
        images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
        width: dims.width,
        height: dims.height,
        pattern_fill: patternFill,
      });
    }
    if (placeholders.length) areasBySize.set(size, { variant_ids: [], placeholders });
  }

  if (!areasBySize.size) {
    throw new PrintifyError(
      "No AOP placeholders found for this blueprint/provider — cannot build print areas.",
    );
  }

  for (const variant of rawVariants) {
    const area = areasBySize.get(sizeByVariant.get(variant.id) ?? "");
    if (area) area.variant_ids.push(variant.id);
  }

  const cleaned = [...areasBySize.values()].filter((a) => a.variant_ids.length);
  if (!cleaned.length) {
    throw new PrintifyError("Failed to construct AOP print areas for the given blueprint.");
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Workflow 1 — AOP product creation (port of create_aop_product)
// ---------------------------------------------------------------------------

async function createAopProduct(input: {
  title: string;
  description?: string;
  design_image_url: string;
  image_file_name?: string;
  blueprint_id?: number;
  print_provider_id?: number;
  retail_price_usd?: number;
  enabled_variants?: number[];
  variant_prices?: Record<string, number>;
  tags?: string[];
  publish?: boolean;
  shop_id?: string;
  storefront_sku?: string;
}) {
  const shop = await resolveShopId(input.shop_id);
  const bp = input.blueprint_id ?? DEFAULT_BLUEPRINT_ID;
  const pp = input.print_provider_id ?? DEFAULT_PRINT_PROVIDER_ID;

  // 1) Upload the design asset.
  const safe =
    (input.image_file_name ?? input.title ?? "design")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .slice(0, 80) || "design";
  const uploaded = (await printifyRequest("POST", "/uploads/images.json", {
    file_name: safe,
    url: input.design_image_url,
  })) as { id?: string };
  const imageId = uploaded.id;
  if (!imageId) throw new PrintifyError("Printify did not return an image id after upload.");

  // 2) Fetch live variants + placeholders.
  const variantsPayload = (await listVariants(bp, pp)) as { variants?: RawVariant[] };
  const allVariants = variantsPayload.variants ?? [];

  // 3) Pricing: the catalog endpoint returns no base costs for AOP blueprints,
  // so pricing is explicit — retail_price_usd for all variants, overridable.
  const allowed = input.enabled_variants ? new Set(input.enabled_variants) : null;
  const overrides = new Map<number, number>(
    Object.entries(input.variant_prices ?? {}).map(([k, v]) => [Number(k), Math.round(v * 100)]),
  );
  const defaultPrice = Math.round((input.retail_price_usd ?? 49) * 100);
  if (defaultPrice <= 0) throw new Error("retail_price_usd must be greater than 0");

  const productVariants = allVariants
    .filter((v) => !allowed || allowed.has(v.id))
    .map((v) => ({ id: v.id, price: overrides.get(v.id) ?? defaultPrice }));
  if (!productVariants.length) {
    throw new PrintifyError("No variants selected — check enabled_variants input.");
  }

  const printAreas = buildAopPrintAreas(imageId, variantsPayload);

  // 4) Create the product.
  const created = (await printifyRequest("POST", `/shops/${shop}/products.json`, {
    title: input.title,
    description: input.description ?? "",
    blueprint_id: bp,
    print_provider_id: pp,
    variants: productVariants,
    print_areas: printAreas,
    tags: input.tags ?? ["kiyumi", "aop"],
  })) as { id?: string };

  const productId = String(created.id ?? "");
  if (input.publish && productId) {
    try {
      await printifyRequest("POST", `/shops/${shop}/products/${productId}/publish.json`, {
        title: true,
        description: true,
        images: true,
        variants: true,
        tags: true,
      });
    } catch (err) {
      console.warn(`publish failed for ${productId}:`, err);
    }
  }

  const byId = new Map(allVariants.map((v) => [v.id, v]));
  return {
    printify_product_id: productId,
    blueprint_id: bp,
    print_provider_id: pp,
    shop_id: shop,
    image_id: imageId,
    storefront_sku: input.storefront_sku ?? null,
    variants: productVariants.map((v) => ({
      variant_id: v.id,
      price_cents: v.price,
      options: byId.get(v.id)?.options ?? {},
      title: byId.get(v.id)?.title ?? null,
    })),
    printify_product_url: `https://printify.com/app/products/${productId}`,
  };
}

// ---------------------------------------------------------------------------
// Workflow 2 — shipping quote + production order (ports)
// ---------------------------------------------------------------------------

async function quoteShipping(input: {
  line_items: Array<{ product_id: string; variant_id: number; quantity: number }>;
  country: string;
  region?: string;
  city?: string;
  zip?: string;
  shop_id?: string;
}) {
  const shop = await resolveShopId(input.shop_id);
  const addressTo: Record<string, unknown> = {
    first_name: "Quote",
    last_name: "Request",
    country: input.country.toUpperCase(),
  };
  if (input.region) addressTo.region = input.region;
  if (input.city) addressTo.city = input.city;
  if (input.zip) addressTo.zip = input.zip;

  const result = await printifyRequest("POST", `/shops/${shop}/orders/shipping.json`, {
    line_items: input.line_items,
    address_to: addressTo,
  });

  // Printify response shapes seen in the wild:
  //   1. Flat method→cents map: {"standard": 1249, "express": 2899}
  //   2. Provider→method map:   {"10": {"standard": 1249}}
  //   3. Bare list of option objects: [{id, price, title, ...}]
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const options: Record<string, unknown>[] = [];
  if (Array.isArray(result)) {
    options.push(...(result as Record<string, unknown>[]).filter((o) => o && typeof o === "object"));
  } else if (result && typeof result === "object") {
    for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
      if (typeof value === "number") {
        options.push({ id: key, price: value, title: titleCase(key) });
      } else if (Array.isArray(value)) {
        options.push(...(value as Record<string, unknown>[]).filter((o) => o && typeof o === "object"));
      } else if (value && typeof value === "object") {
        const nested = value as Record<string, unknown>;
        if (Object.values(nested).every((v) => typeof v === "number")) {
          // provider→method map
          for (const [method, price] of Object.entries(nested)) {
            options.push({ id: method, price, title: titleCase(method), print_provider_id: key });
          }
        } else {
          options.push(nested);
        }
      }
    }
  }
  return options;
}

async function createProductionOrder(input: {
  external_order_id: string;
  line_items: Array<{ product_id: string; variant_id: number; quantity: number }>;
  shipping_address: Record<string, string | undefined>;
  shipping_method?: number;
  send_shipping_notification?: boolean;
  label?: string;
  shop_id?: string;
}) {
  const shop = await resolveShopId(input.shop_id);
  const addr = input.shipping_address ?? {};

  const addressTo: Record<string, unknown> = {
    first_name: addr.first_name ?? "",
    last_name: addr.last_name ?? "",
    country: (addr.country ?? "").toUpperCase(),
  };
  for (const key of ["email", "phone", "region", "city", "address2"]) {
    if (addr[key]) addressTo[key] = addr[key];
  }
  if (addr.address1) addressTo.address1 = addr.address1;
  if (addr.zip) addressTo.zip = addr.zip;

  if (!addressTo.country) throw new Error("shipping_address.country is required (ISO-2 code).");
  if (!addressTo.address1) throw new Error("shipping_address.address1 is required.");
  if (!addressTo.zip && REQUIRED_ZIP_COUNTRIES.has(String(addressTo.country))) {
    throw new Error(`shipping_address.zip is required for ${addressTo.country} orders.`);
  }

  return printifyRequest("POST", `/shops/${shop}/orders.json`, {
    external_id: input.external_order_id,
    label: input.label ?? `kiyumi-${input.external_order_id}`,
    send_shipping_notification: input.send_shipping_notification ?? true,
    line_items: input.line_items,
    shipping_method: input.shipping_method ?? 1,
    address_to: addressTo,
  });
}

// ---------------------------------------------------------------------------
// Workflow 3 — shipment webhook parsing (port of parse_shipment_webhook)
// ---------------------------------------------------------------------------

const CARRIER_URL_TEMPLATES: Record<string, string> = {
  usps: "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}",
  ups: "https://www.ups.com/track?tracknum={tracking}",
  fedex: "https://www.fedex.com/fedextrack/?trknbr={tracking}",
  dhl: "https://www.dhl.com/en/express/tracking.html?AWB={tracking}",
  dhl_ecommerce: "https://webtrack.dhlglobalmail.com/?trackingnumber={tracking}",
  canada_post: "https://www.canadapost-postescanada.ca/track-reperage/en#/details/{tracking}",
  royal_mail: "https://www.royalmail.com/track-your-item#!/tracking-results/{tracking}",
  australia_post: "https://auspost.com.au/mypost/track/#/details/{tracking}",
};

function parseShipmentWebhook(payload: Record<string, unknown>) {
  const event = String(payload.type ?? payload.event ?? "");
  let resource = (payload.resource ?? payload.data ?? payload) as Record<string, unknown>;
  if (Array.isArray(resource)) resource = (resource[0] ?? {}) as Record<string, unknown>;

  const shipmentsRaw = resource.shipments ?? [];
  const rawList = Array.isArray(shipmentsRaw) ? shipmentsRaw : [shipmentsRaw];

  const shipments = rawList.map((s) => {
    const shipment = (s ?? {}) as Record<string, unknown>;
    const number = String(shipment.number ?? shipment.tracking_number ?? "").trim();
    const carrier = String(shipment.carrier ?? "").trim().toLowerCase();
    let url = String(shipment.url ?? "");
    if (!url && number) {
      const template = CARRIER_URL_TEMPLATES[carrier];
      if (template) url = template.replace("{tracking}", number);
    }
    return {
      tracking_number: number,
      tracking_url: url,
      carrier,
      shipped_at: shipment.shipped_at ?? shipment.created_at ?? null,
    };
  });

  return {
    event,
    order_id: resource.id != null ? String(resource.id) : null,
    external_order_id: (resource.external_id as string | undefined) ?? null,
    status: resource.status ?? null,
    shipments,
  };
}

// ---------------------------------------------------------------------------
// Supabase persistence (port of supabase_db.py, via service-role REST)
// ---------------------------------------------------------------------------

interface DbConfig {
  url: string;
  key: string;
}

function dbConfig(): DbConfig | null {
  const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? "";
  if (!url || !key) return null;
  return { url, key };
}

async function dbInsert(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const db = dbConfig();
  if (!db) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.");
  const response = await fetch(`${db.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: db.key,
      Authorization: `Bearer ${db.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    throw new Error(
      `insert into ${table} failed (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  }
  const data = await response.json();
  return Array.isArray(data) && data.length ? data[0] : {};
}

async function dbSelectOne(
  table: string,
  filters: string,
): Promise<Record<string, unknown> | null> {
  const db = dbConfig();
  if (!db) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.");
  const response = await fetch(`${db.url}/rest/v1/${table}?${filters}&select=*&limit=1`, {
    headers: { apikey: db.key, Authorization: `Bearer ${db.key}` },
  });
  if (!response.ok) {
    throw new Error(
      `select from ${table} failed (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  }
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows.length ? rows[0] : null;
}

async function dbUpdate(
  table: string,
  filters: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = dbConfig();
  if (!db) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.");
  const response = await fetch(`${db.url}/rest/v1/${table}?${filters}`, {
    method: "PATCH",
    headers: {
      apikey: db.key,
      Authorization: `Bearer ${db.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(
      `update ${table} failed (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  }
}

async function dbList(
  table: string,
  order: string,
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const db = dbConfig();
  if (!db) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.");
  const response = await fetch(
    `${db.url}/rest/v1/${table}?select=*&order=${order}&limit=${limit}`,
    { headers: { apikey: db.key, Authorization: `Bearer ${db.key}` } },
  );
  if (!response.ok) {
    throw new Error(
      `list ${table} failed (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  }
  return response.json();
}

async function dbSelectAll(
  table: string,
  limit = 500,
): Promise<Array<Record<string, unknown>>> {
  const db = dbConfig();
  if (!db) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.");
  const response = await fetch(`${db.url}/rest/v1/${table}?select=*&limit=${limit}`, {
    headers: { apikey: db.key, Authorization: `Bearer ${db.key}` },
  });
  if (!response.ok) {
    throw new Error(
      `list ${table} failed (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Printify → storefront product sync (admin): POD products become sellable
// ---------------------------------------------------------------------------

const IMPORT_COLLECTION = "PRINTIFY IMPORTS";

const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#0A0A0A",
  white: "#FFFFFF",
  navy: "#1A1A2E",
  red: "#8B0000",
  purple: "#6B21A8",
  blue: "#1D4ED8",
  green: "#15803D",
  grey: "#6B7280",
  gray: "#6B7280",
  sand: "#D6C9B1",
  pink: "#F9A8D4",
  yellow: "#FACC15",
  maroon: "#7F1D1D",
  orange: "#EA580C",
};

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL", "XXL", "3XL"];

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (/hood|sweat|bomber|jacket|windbreaker|outerwear/.test(t)) return "Hoodies & Outerwear";
  if (/pant|cargo|jogger|short|trouser|hat|cap|beanie|accessor/.test(t)) return "Bottoms & Accessories";
  return "Tees";
}

function stripHtml(html: string, max = 700): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function ensureImportCollection(): Promise<void> {
  const existing = await dbSelectOne(
    "collections",
    `name=eq.${encodeURIComponent(IMPORT_COLLECTION)}`,
  );
  if (!existing) {
    await dbInsert("collections", {
      name: IMPORT_COLLECTION,
      description: "Imported from Printify — managed automatically.",
      sort_order: 99,
    });
  }
}

async function syncPrintifyProducts(): Promise<Record<string, unknown>> {
  const shop = await resolveShopId();
  // List endpoint returns a paginated object: { data: [...], last_page, ... }.
  const listRes = (await printifyRequest(
    "GET",
    `/shops/${shop}/products.json?limit=50`,
  )) as Record<string, unknown> | Array<Record<string, unknown>>;
  const listRows = (
    Array.isArray(listRes) ? listRes : ((listRes.data ?? []) as Array<Record<string, unknown>>)
  ).filter(Boolean);

  await ensureImportCollection();

  const existingRows = await dbSelectAll("products", 1000);
  const existingBySku = new Map(existingRows.map((r) => [String(r.sku), r]));

  let imported = 0;
  let updated = 0;
  const skipped: Array<Record<string, unknown>> = [];
  const errors: Array<Record<string, unknown>> = [];

  for (const summary of listRows) {
    const pid = String(summary.id ?? "");
    if (!pid) continue;
    if (summary.visible === false) {
      skipped.push({ id: pid, title: summary.title, reason: "not visible on Printify" });
      continue;
    }

    // The list payload encodes variant options as numeric IDs; the detail
    // payload includes the id→name maps, so fetch each product in full.
    const detail = (await printifyRequest(
      "GET",
      `/shops/${shop}/products/${pid}.json`,
    )) as Record<string, unknown>;

    const variants = (Array.isArray(detail.variants) ? detail.variants : []) as Array<
      Record<string, unknown>
    >;
    const enabled = variants.filter((v) => v.is_enabled !== false);
    if (!enabled.length) {
      skipped.push({ id: pid, title: detail.title, reason: "no enabled variants" });
      continue;
    }

    // Two dimensions: color + size. Their value ids are known from the option
    // definitions, and a variant's options array may list ids in EITHER order,
    // so classify each id against the color/size id sets (position lies).
    const colorLabels = new Map<string, string>();
    const sizeLabels = new Map<string, string>();
    const optsList = (Array.isArray(detail.options) ? detail.options : []) as Array<
      Record<string, unknown>
    >;
    const colorDim = optsList.findIndex((o) => String(o.type ?? "") === "color");
    for (const opt of optsList) {
      const isColor = String(opt.type ?? "") === "color";
      const target = isColor ? colorLabels : sizeLabels;
      for (const raw of (Array.isArray(opt.values) ? opt.values : []) as Array<unknown>) {
        if (raw == null) continue;
        if (typeof raw === "object") {
          const rec = raw as { id?: unknown; title?: unknown };
          const id = String(rec.id ?? "");
          const title = rec.title != null ? String(rec.title).trim() : "";
          if (id && title) target.set(id, title);
        } else {
          const id = String(raw);
          if (id) target.set(id, "");
        }
      }
    }
    if (colorDim < 0) {
      // No explicit color dimension: treat every option id as size.
      for (const [id, label] of colorLabels) {
        sizeLabels.set(id, label);
        colorLabels.delete(id);
      }
    }

    const classify = (v: Record<string, unknown>): { color: string; size: string } => {
      const raw = v.options;
      let color = "";
      let size = "";
      if (Array.isArray(raw)) {
        for (const entry of raw) {
          const id = String(entry ?? "");
          if (colorLabels.has(id) && !color) color = colorLabels.get(id) ?? "";
          else if (sizeLabels.has(id) && !size) size = sizeLabels.get(id) ?? "";
        }
      } else if (raw && typeof raw === "object") {
        const rec = raw as Record<string, unknown>;
        color = rec.color ? String(rec.color) : "";
        size = rec.size ? String(rec.size) : "";
      }
      if (!size) {
        // Fall back to the human title: "Color / Size".
        const m = /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i.exec(String(v.title ?? ""));
        if (m) size = m[1].toUpperCase();
      }
      if (!color) {
        const parts = String(v.title ?? "").split("/");
        if (parts.length > 1) color = parts[0].trim();
      }
      return { color, size };
    };

    const images = ((Array.isArray(detail.images) ? detail.images : []) as Array<
      Record<string, unknown>
    >)
      .map((i) => String(i.src ?? ""))
      .filter((s) => s.startsWith("http"));
    if (!images.length) {
      skipped.push({ id: pid, title: detail.title, reason: "no preview images" });
      continue;
    }

    const enabledSkus = enabled.map((v) => String(v.sku ?? "").trim()).filter(Boolean);
    const baseSku = `PF-${pid.slice(-8).toUpperCase()}`;

    const prices = enabled.map((v) => Number(v.price ?? 0)).filter((n) => n > 0);
    const minPrice = prices.length ? Math.min(...prices) / 100 : 0;

    const sizes = [
      ...new Set(enabled.map((v) => classify(v).size).filter(Boolean)),
    ].sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.toUpperCase());
      const bi = SIZE_ORDER.indexOf(b.toUpperCase());
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

    const colors = [
      ...new Set(
        enabled
          .map((v) => classify(v).color)
          .filter(Boolean)
          .map((c) => COLOR_NAME_TO_HEX[c.toLowerCase()] ?? c),
      ),
    ].slice(0, 6);

    const title = String(detail.title ?? `Printify ${pid}`);
    const row = {
      name: title,
      price: minPrice,
      description: stripHtml(String(detail.description ?? "")),
      images,
      category: guessCategory(`${title} ${JSON.stringify(detail.tags ?? [])}`),
      collection: IMPORT_COLLECTION,
      sizes: sizes.length ? sizes : ["S", "M", "L", "XL"],
      colors: colors.length ? colors : ["#0A0A0A"],
      stock: 999, // made-to-order POD
    };

    const variantRows = enabled.map((v) => ({
      variant_id: Number(v.id ?? 0),
      price_cents: Number(v.price ?? 0),
      options: (() => {
        const c = classify(v);
        return { color: c.color, size: c.size };
      })(),
      title: String(v.title ?? "") || null,
    }));

    try {
      const existing = existingBySku.get(baseSku);
      if (existing) {
        // Refresh sellable facts only — preserve admin curation
        // (featured, gaming_drop, qikink_sku, collection/category overrides).
        await dbUpdate("products", `id=eq.${existing.id}`, {
          name: row.name,
          price: row.price,
          description: row.description,
          images: row.images,
          sizes: row.sizes,
          colors: row.colors,
          stock: row.stock,
        });
        updated += 1;
      } else {
        await dbInsert("products", { ...row, sku: baseSku });
        existingBySku.set(baseSku, { sku: baseSku });
        imported += 1;
      }

      // Upsert the SKU → Printify mapping so orders route to production.
      await saveProductMapping(
        {
          printify_product_id: pid,
          blueprint_id: Number(detail.blueprint_id ?? 0),
          print_provider_id: Number(detail.print_provider_id ?? 0),
          image_id: String(
            ((Array.isArray(detail.images) ? detail.images : []) as Array<Record<string, unknown>>)[0]
              ?.id ?? "",
          ),
          shop_id: shop,
          variants: variantRows,
        },
        baseSku,
      );
    } catch (err) {
      errors.push({
        id: pid,
        sku: baseSku,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    await dbInsert("printify_events", {
      event: "catalog.syncProducts",
      payload: { imported, updated, skipped: skipped.length, errors: errors.length },
    });
  } catch {
    /* audit best-effort */
  }

  return { total_remote: listRows.length, imported, updated, skipped, errors };
}
// ---------------------------------------------------------------------------
// Checkout — route a storefront bag into Printify (public, called by guests)
// ---------------------------------------------------------------------------

// Storefront hex colors → Printify garment color names (best-effort match).
const COLOR_NAMES: Array<[string, string]> = [
  ["#0a0a0a", "black"],
  ["#000000", "black"],
  ["#1c1c1c", "black"],
  ["#ffffff", "white"],
  ["#fff", "white"],
  ["#1a1a2e", "navy"],
  ["#8b0000", "red"],
  ["#6b21a8", "purple"],
];

const SIZE_ALIASES: Record<string, string> = {
  xxl: "2xl",
  "2xl": "2xl",
  xxxl: "3xl",
  "3xl": "3xl",
};

const normSize = (s: string) => SIZE_ALIASES[s.trim().toLowerCase()] ?? s.trim().toLowerCase();

interface CheckoutItem {
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unit_price_cents?: number;
  name?: string;
}

function matchVariant(
  mapping: Record<string, unknown>,
  item: CheckoutItem,
): { variant_id: number; title: string | null } | null {
  const variants = (mapping.variants ?? []) as Array<{
    variant_id: number;
    title: string | null;
    options: Record<string, unknown>;
  }>;
  if (!variants.length) return null;

  const wantSize = normSize(item.size);
  const hex = (item.color ?? "").toLowerCase();
  const colorName = COLOR_NAMES.find(([h]) => h === hex)?.[1] ?? "";

  const sizeMatches = variants.filter(
    (v) => normSize(String(v.options?.size ?? "")) === wantSize,
  );
  const pool = sizeMatches.length ? sizeMatches : variants; // fallback: any variant
  const colorMatch = colorName
    ? pool.find((v) => String(v.options?.color ?? "").toLowerCase().includes(colorName))
    : undefined;
  const chosen = colorMatch ?? pool[0];
  return chosen ? { variant_id: chosen.variant_id, title: chosen.title } : null;
}

// ---------------------------------------------------------------------------
// Qikink order push — maps storefront orders onto the Qikink Open API payload
// ---------------------------------------------------------------------------

// Qikink order_number: alphanumeric, max 15 chars.
const qikinkOrderNumberFor = (orderId: string) =>
  `KY${orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 13)}`;

// products.qikink_sku is either a plain SKU (used for every size/color) or a
// JSON map keyed by "color:size" or "size", e.g.
//   {"black:M":"MVnHs-Bk-M", "L":"MVnHs-Wh-L"}
function resolveQikinkSku(raw: unknown, color: string, size: string): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (!value.startsWith("{")) return value;
  try {
    const map = JSON.parse(value) as Record<string, string>;
    const c = color.trim().toLowerCase();
    const s = size.trim().toLowerCase();
    for (const key of [`${c}:${s}`, `${c} : ${s}`, s, "*"]) {
      const hit = Object.entries(map).find(([k]) => k.trim().toLowerCase() === key);
      if (hit?.[1]) return String(hit[1]).trim();
    }
    return null;
  } catch {
    return value; // malformed JSON — treat as a plain SKU
  }
}

function splitPersonName(fullName: string): { first: string; last: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "Kiyumi", last: "Customer" };
  if (parts.length === 1) return { first: parts[0], last: "-" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// cents → major units string (Qikink wants rupees, no decimals)
const majorUnits = (cents: unknown) => String(Math.round(Number(cents ?? 0)) / 100);

async function buildQikinkPayload(orderRow: Record<string, unknown>) {
  const items = (Array.isArray(orderRow.items) ? orderRow.items : []) as Array<
    Record<string, unknown>
  >;
  const address = (orderRow.shipping_address ?? {}) as Record<string, unknown>;
  const products = await dbSelectAll("products", 1000);
  const bySku = new Map(products.map((p) => [String(p.sku), p]));

  const lineItems: Array<Record<string, unknown>> = [];
  const unmatched: Array<{ sku: string; reason: string }> = [];

  for (const item of items) {
    const sku = String(item.sku ?? "");
    const product = bySku.get(sku);
    if (!product) {
      unmatched.push({ sku, reason: "product not found" });
      continue;
    }
    const qikinkSku = resolveQikinkSku(
      product.qikink_sku,
      String(item.color ?? ""),
      String(item.size ?? ""),
    );
    if (!qikinkSku) {
      unmatched.push({ sku, reason: "no qikink_sku set on product" });
      continue;
    }
    const design = product.images?.[0] ? String(product.images[0]) : "";
    if (!design) {
      unmatched.push({ sku, reason: "product has no image for the print file" });
      continue;
    }
    lineItems.push({
      search_from_my_products: 0,
      sku: qikinkSku,
      quantity: String(Math.max(1, Number(item.quantity ?? 1))),
      price: majorUnits(item.unit_price_cents),
      print_type_id: 1, // 1 = DTG
      designs: [
        {
          design_code: String(product.sku ?? item.name ?? "KIYUMI")
            .replace(/[^A-Za-z0-9._-]/g, "-")
            .slice(0, 40),
          width_inches: "10",
          height_inches: "10",
          placement_sku: "fr", // front print
          design_link: design,
          mockup_link: design,
        },
      ],
    });
  }

  const name = splitPersonName(String(orderRow.customer_name ?? ""));
  const phone = String(address.phone ?? "").trim();
  const country = String(address.country ?? "IN").trim().toUpperCase();
  const payload = {
    order_number: qikinkOrderNumberFor(String(orderRow.id)),
    qikink_shipping: "1", // Qikink fulfills shipping
    gateway: "Prepaid",
    total_order_value: majorUnits(orderRow.total_cents),
    line_items: lineItems,
    shipping_address: {
      first_name: name.first,
      last_name: name.last,
      address1: String(address.address1 ?? ""),
      address2: String(address.address2 ?? ""),
      phone: phone || "9999999999",
      email: String(orderRow.customer_email ?? ""),
      city: String(address.city ?? ""),
      zip: String(address.zip ?? ""),
      province: String(address.region ?? address.state ?? ""),
      country_code: country.length === 2 ? country : "IN",
    },
  };
  return { lineItems, unmatched, payload };
}

async function pushOrderToQikink(
  orderRow: Record<string, unknown>,
  opts: { dryRun?: boolean } = {},
) {
  const orderId = String(orderRow.id);
  const { lineItems, unmatched, payload } = await buildQikinkPayload(orderRow);

  if (!lineItems.length) {
    return {
      ok: false as const,
      skipped: true,
      error: "no qikink-mapped items in this order",
      unmatched,
      payload,
    };
  }
  if (opts.dryRun) {
    return { ok: true as const, dryRun: true, order_number: payload.order_number, payload, unmatched };
  }

  try {
    const result = (await qikinkRequest("POST", "/api/order/create", payload)) as Record<
      string,
      unknown
    >;
    const qikinkOrderId =
      String(result.order_id ?? result.ordernumber ?? result.order_number ?? "") || null;
    await dbUpdate("orders", `id=eq.${orderId}`, {
      qikink_order_id: qikinkOrderId,
      fulfillment_status: "synced",
      qikink_sync_error: null,
      status: "routed",
    });
    try {
      await dbInsert("qikink_events", {
        event: "order.created",
        qikink_order_id: qikinkOrderId,
        order_number: payload.order_number,
        external_order_id: orderId,
        payload: result,
      });
    } catch {
      /* audit is best-effort */
    }
    return {
      ok: true as const,
      order_number: payload.order_number,
      qikink_order_id: qikinkOrderId,
      response: result,
      unmatched,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      // Mark the order as "Failed to Sync with Provider" — retryable from admin.
      await dbUpdate("orders", `id=eq.${orderId}`, {
        fulfillment_status: "failed",
        qikink_sync_error: message,
      });
      await dbInsert("qikink_events", {
        event: "order.create_failed",
        order_number: payload.order_number,
        external_order_id: orderId,
        payload: { error: message, payload },
      });
    } catch {
      /* best-effort */
    }
    return { ok: false as const, error: message, unmatched, payload };
  }
}

async function handleCheckoutSubmit(body: Record<string, unknown>): Promise<Response> {
  const customer = (body.customer ?? {}) as Record<string, string | undefined>;
  const address = (body.shipping_address ?? {}) as Record<string, string | undefined>;
  const rawItems = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];

  const items: CheckoutItem[] = rawItems.map((i) => ({
    sku: String(i.sku ?? "").trim(),
    size: String(i.size ?? "").trim(),
    color: String(i.color ?? "").trim(),
    quantity: Math.max(1, Number(i.quantity ?? 1)),
    unit_price_cents: i.unit_price_cents != null ? Math.round(Number(i.unit_price_cents)) : undefined,
    name: i.name ? String(i.name) : undefined,
  })).filter((i) => i.sku);

  const email = String(customer.email ?? "").trim();
  const firstName = String(customer.first_name ?? address.first_name ?? "").trim();
  const lastName = String(customer.last_name ?? address.last_name ?? "").trim();

  if (!items.length) return errorResponse("'items' with at least one sku is required", 400);
  if (!email.includes("@")) return errorResponse("'customer.email' is required", 400);
  if (!String(address.address1 ?? "").trim()) return errorResponse("'shipping_address.address1' is required", 400);
  if (!String(address.country ?? "").trim()) return errorResponse("'shipping_address.country' is required", 400);
  if (!String(address.zip ?? "").trim()) return errorResponse("'shipping_address.zip' is required", 400);

  // 1) Persist the storefront order first (source of truth, even if routing fails).
  const subtotalCents = items.reduce(
    (sum, i) => sum + (i.unit_price_cents ?? 0) * i.quantity,
    0,
  );
  const orderRow = await dbInsert("orders", {
    customer_email: email,
    customer_name: `${firstName} ${lastName}`.trim(),
    shipping_address: { ...address, ...customer },
    items,
    subtotal_cents: subtotalCents,
    shipping_cents: 0,
    total_cents: subtotalCents,
    currency: String(body.currency ?? "USD"),
    status: "pending",
    payment_status: String(body.payment_status ?? "unpaid"),
  });
  const orderId = String(orderRow.id);

  // 2) Map bag items onto Printify products/variants.
  const mappings = await dbSelectAll("printify_products");
  const bySku = new Map(mappings.map((m) => [String(m.storefront_sku), m]));

  const lineItems: Array<{ product_id: string; variant_id: number; quantity: number }> = [];
  const unrouted: Array<{ sku: string; reason: string }> = [];
  for (const item of items) {
    const mapping = bySku.get(item.sku);
    if (!mapping) {
      unrouted.push({ sku: item.sku, reason: "not published to Printify" });
      continue;
    }
    const variant = matchVariant(mapping, item);
    if (!variant) {
      unrouted.push({ sku: item.sku, reason: "no matching Printify variant" });
      continue;
    }
    lineItems.push({
      product_id: String(mapping.printify_product_id),
      variant_id: variant.variant_id,
      quantity: item.quantity,
    });
  }

  // 1.5) Order-confirmation email — fire after persistence, before routing,
  // so the customer hears about it even if Printify routing hiccups.
  try {
    await sendOrderConfirmationEmail({
      id: orderId,
      customer_email: email,
      customer_name: `${firstName} ${lastName}`.trim(),
      items: items.map((i) => ({
        name: i.name,
        sku: i.sku,
        size: i.size,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
      })),
      subtotal_cents: subtotalCents,
      currency: String(body.currency ?? "USD"),
    });
  } catch (err) {
    console.error("confirmation email failed:", err instanceof Error ? err.message : err);
  }

  // 3) Route to Printify when possible (draft order — production is sent manually).
  let printifyOrder: Record<string, unknown> | null = null;
  let routingError: string | null = null;
  if (lineItems.length) {
    try {
      printifyOrder = (await createProductionOrder({
        external_order_id: orderId,
        line_items: lineItems,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone: customer.phone,
          country: address.country,
          region: address.region,
          city: address.city,
          address1: address.address1,
          address2: address.address2,
          zip: address.zip,
        },
        send_shipping_notification: true,
      })) as Record<string, unknown>;

      await saveOrderRecord({ external_order_id: orderId, printify: printifyOrder });
      await dbUpdate("orders", `id=eq.${orderId}`, { status: "routed" });
    } catch (err) {
      routingError = err instanceof Error ? err.message : String(err);
      console.error("checkout routing failed:", routingError);
      try {
        await dbInsert("printify_events", {
          event: "checkout.routing_failed",
          external_order_id: orderId,
          payload: { error: routingError, line_items: lineItems },
        });
      } catch {
        /* logging is best-effort */
      }
    }
  }

  // 4) Auto-push to Qikink for POD items mapped via products.qikink_sku.
  //    Independent of Printify — an order can route to both providers.
  let qikink: {
    pushed: boolean;
    ok?: boolean;
    order_number?: string | null;
    qikink_order_id?: string | null;
    error?: string;
  } = { pushed: false };
  try {
    const freshOrder = await dbSelectOne("orders", `id=eq.${orderId}`);
    if (freshOrder) {
      const push = await pushOrderToQikink(freshOrder);
      if (push.skipped) {
        qikink = { pushed: false };
      } else if (push.ok) {
        qikink = {
          pushed: true,
          ok: true,
          order_number: push.order_number ?? null,
          qikink_order_id: push.qikink_order_id ?? null,
        };
      } else {
        qikink = { pushed: true, ok: false, error: push.error };
      }
    }
  } catch (err) {
    console.error("qikink auto-push failed:", err instanceof Error ? err.message : err);
    qikink = { pushed: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const routedAnywhere = Boolean(printifyOrder) || qikink.ok === true;
  return json(
    {
      order_id: orderId,
      status: routedAnywhere ? "routed" : "pending",
      printify_order_id: printifyOrder ? String(printifyOrder.id ?? "") : null,
      qikink_order_id: qikink.qikink_order_id ?? null,
      fulfillment_status: qikink.pushed ? (qikink.ok ? "synced" : "failed") : "pending",
      unrouted,
      routing_error: routingError,
      qikink_error: qikink.error ?? null,
    },
    201,
  );
}

// ---------------------------------------------------------------------------
// Admin auth (port of _admin_authorized): validate Supabase access token
// ---------------------------------------------------------------------------

async function isAdminRequest(request: Request): Promise<{ ok: boolean; email: string | null }> {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return { ok: false, email: null };
  const token = header.slice(7).trim();
  if (!token) return { ok: false, email: null };

  const db = dbConfig();
  if (!db) return { ok: false, email: null };

  try {
    const response = await fetch(`${db.url}/auth/v1/user`, {
      headers: { apikey: db.key, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { ok: false, email: null };
    const user = (await response.json()) as { email?: string | null };
    const email = (user.email ?? "").toLowerCase();
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "workrud14@gmail.com").toLowerCase();
    return { ok: email === adminEmail, email };
  } catch {
    return { ok: false, email: null };
  }
}

// ---------------------------------------------------------------------------
// DB persistence operations used by the admin routes
// ---------------------------------------------------------------------------

async function saveProductMapping(result: Record<string, unknown>, sku: string) {
  const existing = await dbSelectOne("printify_products", `storefront_sku=eq.${encodeURIComponent(sku)}`);
  const payload = {
    storefront_sku: sku,
    printify_product_id: String(result.printify_product_id ?? ""),
    blueprint_id: Number(result.blueprint_id ?? 0),
    print_provider_id: Number(result.print_provider_id ?? 0),
    image_id: String(result.image_id ?? ""),
    shop_id: String(result.shop_id ?? ""),
    variants: result.variants ?? [],
  };
  if (existing) {
    await dbUpdate(
      "printify_products",
      `storefront_sku=eq.${encodeURIComponent(sku)}`,
      { ...payload, storefront_sku: undefined },
    );
  } else {
    await dbInsert("printify_products", payload);
  }
}

async function saveOrderRecord(input: {
  external_order_id: string;
  printify: Record<string, unknown>;
}) {
  const payload = {
    external_order_id: input.external_order_id,
    printify_order_id: String(input.printify.id ?? ""),
    status: String(input.printify.status ?? "pending"),
    total_price_cents: Number(input.printify.total_price ?? 0) || null,
    total_shipping_cents: Number(input.printify.total_shipping ?? 0) || null,
    shipping_method: 1,
    raw_response: input.printify,
  };
  const existing = await dbSelectOne(
    "printify_orders",
    `external_order_id=eq.${encodeURIComponent(input.external_order_id)}`,
  );
  if (existing) {
    await dbUpdate("printify_orders", `id=eq.${existing.id}`, payload);
    return { ...payload, id: existing.id };
  }
  return dbInsert("printify_orders", payload);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function handleWebhook(request: Request, url: URL): Promise<Response> {
  const secret = (Deno.env.get("PRINTIFY_WEBHOOK_SECRET") ?? "").trim();
  if (secret) {
    const provided = url.searchParams.get("secret");
    if (provided !== secret) {
      return errorResponse("forbidden", 403);
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const parsed = parseShipmentWebhook(payload);
  const printifyOrderId = parsed.order_id;
  const externalId = parsed.external_order_id;

  let recordId: string | null = null;
  try {
    const row =
      (externalId
        ? await dbSelectOne("printify_orders", `external_order_id=eq.${encodeURIComponent(externalId)}`)
        : null) ??
      (printifyOrderId
        ? await dbSelectOne("printify_orders", `printify_order_id=eq.${printifyOrderId}`)
        : null);
    if (row) recordId = String(row.id);
  } catch (err) {
    console.error("webhook db lookup failed:", err);
  }

  if (recordId) {
    try {
      await dbUpdate("printify_orders", `id=eq.${recordId}`, {
        status: "fulfilled",
        ...(printifyOrderId ? { printify_order_id: printifyOrderId } : {}),
        ...(parsed.shipments[0]?.tracking_number
          ? { tracking_number: parsed.shipments[0].tracking_number }
          : {}),
        ...(parsed.shipments[0]?.tracking_url
          ? { tracking_url: parsed.shipments[0].tracking_url }
          : {}),
        ...(parsed.shipments[0]?.carrier ? { carrier: parsed.shipments[0].carrier } : {}),
      });
      for (const shipment of parsed.shipments) {
        await dbInsert("printify_shipments", {
          order_record_id: recordId,
          tracking_number: shipment.tracking_number || null,
          tracking_url: shipment.tracking_url || null,
          carrier: shipment.carrier || null,
          shipped_at: shipment.shipped_at,
        });
      }
    } catch (err) {
      console.error("webhook db write failed:", err);
    }
  }

  try {
    await dbInsert("printify_events", {
      event: parsed.event || "order.shipment.created",
      printify_order_id: printifyOrderId,
      external_order_id: externalId,
      payload,
    });
  } catch (err) {
    console.error("event log failed:", err);
  }

  // Best-effort shipping email to the customer (skipped when Resend isn't
  // configured or the storefront order can't be resolved).
  if (externalId) {
    try {
      const order = await dbSelectOne("orders", `id=eq.${externalId}`);
      if (order) {
        await sendShippingEmail({
          email: String(order.customer_email ?? ""),
          name: String(order.customer_name ?? "").split(" ")[0] ?? "",
          orderId: externalId,
          trackingNumber: parsed.shipments[0]?.tracking_number ?? "",
          trackingUrl: parsed.shipments[0]?.tracking_url ?? null,
          carrier: parsed.shipments[0]?.carrier ?? null,
        });
      }
      await dbUpdate("orders", `id=eq.${externalId}`, { status: "fulfilled" });
    } catch (err) {
      console.error("shipping email/status update failed:", err);
    }
  }

  return json({ ok: true, order_id: printifyOrderId, external_order_id: externalId, shipments: parsed.shipments });
}

// ---------------------------------------------------------------------------
// Qikink webhook — status/tracking updates pushed from the Qikink dashboard
// ---------------------------------------------------------------------------

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeQikinkStatus(raw: string): string | null {
  const s = raw.toLowerCase();
  if (!s) return null;
  if (s.includes("deliver")) return "delivered";
  if (s.includes("ship") || s.includes("dispatch") || s.includes("transit")) return "shipped";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("rto") || s.includes("return")) return "returned";
  if (s.includes("process") || s.includes("production") || s.includes("print") || s.includes("ready"))
    return "in_production";
  if (s.includes("place") || s.includes("new") || s.includes("confirm")) return "synced";
  return null;
}

async function handleQikinkWebhook(request: Request, url: URL): Promise<Response> {
  const secret = (Deno.env.get("QIKINK_WEBHOOK_SECRET") ?? "").trim();
  const provided = url.searchParams.get("token") ?? url.searchParams.get("secret") ?? "";
  if (secret && provided !== secret) return errorResponse("forbidden", 403);

  let payload: Record<string, unknown> = {};
  if (request.method === "POST") {
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  const data = (payload.data ?? payload.order ?? payload) as Record<string, unknown>;
  const orderNumber = pickStr(data, [
    "order_number",
    "ordernumber",
    "order_id",
    "orderid",
    "shopify_order_id",
  ]);
  const statusRaw = pickStr(data, ["status", "order_status", "fulfilment_status", "fulfillment_status"]);
  const trackingNumber = pickStr(data, [
    "awb",
    "awb_number",
    "tracking_number",
    "tracking_id",
    "trackingno",
    "tracking",
  ]);
  const courier = pickStr(data, ["courier", "courier_name", "shipping_carrier", "carrier"]);
  const trackingUrl = pickStr(data, ["tracking_url", "tracking_link", "track_url", "awb_url"]);
  const status = normalizeQikinkStatus(statusRaw);

  try {
    await dbInsert("qikink_events", {
      event: statusRaw ? `status.${status ?? "unknown"}` : "webhook.received",
      qikink_order_id: orderNumber || null,
      order_number: orderNumber || null,
      payload,
    });
  } catch {
    /* audit best-effort */
  }

  if (!orderNumber) {
    return json({ ok: true, matched: false, reason: "no order reference in payload" });
  }

  // Qikink may reference us by the order id they returned or by the
  // order_number we sent — try both.
  let order: Record<string, unknown> | null = null;
  for (const candidate of [orderNumber, qikinkOrderNumberFor(orderNumber)]) {
    try {
      order = await dbSelectOne(
        "orders",
        `qikink_order_id=eq.${encodeURIComponent(candidate)}`,
      );
    } catch {
      order = null;
    }
    if (order) break;
  }

  if (!order) return json({ ok: true, matched: false, order_number: orderNumber });

  const patch: Record<string, unknown> = {};
  if (status) patch.fulfillment_status = status;
  if (trackingNumber) {
    patch.tracking_number = trackingNumber;
    patch.courier = courier || null;
    patch.tracking_url = trackingUrl || null;
  }
  if (status === "shipped" || status === "delivered") patch.status = "fulfilled";
  if (Object.keys(patch).length) {
    try {
      await dbUpdate("orders", `id=eq.${order.id}`, patch);
    } catch (err) {
      console.error("qikink webhook update failed:", err);
    }
  }

  if (trackingNumber && (status === "shipped" || !status)) {
    try {
      await sendShippingEmail({
        email: String(order.customer_email ?? ""),
        name: String(order.customer_name ?? "").split(" ")[0] ?? "",
        orderId: String(order.id),
        trackingNumber,
        trackingUrl: trackingUrl || null,
        carrier: courier || null,
      });
    } catch (err) {
      console.error("qikink shipping email failed:", err);
    }
  }

  return json({ ok: true, matched: true, order_id: order.id, applied: patch });
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const isPrintifyWebhook = path.endsWith("/webhook") || path.endsWith("/webhooks/printify");
  const isQikinkWebhook = path.endsWith("/qikink/webhook") || path.endsWith("/webhooks/qikink");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Qikink fulfillment webhook (GET or POST) — secret-gated, no Supabase auth.
    if (isQikinkWebhook) return await handleQikinkWebhook(request, url);

    // Printify shipment webhook target (GET or POST) — secret-gated, no auth.
    if (isPrintifyWebhook) return await handleWebhook(request, url);

    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }
    const route = String(body.route ?? "health");

    // ---- public route: health -------------------------------------------------
    if (route === "health") {
      const tokenSet = Boolean(Deno.env.get("PRINTIFY_API_TOKEN")?.trim());
      let shopId = (Deno.env.get("PRINTIFY_SHOP_ID") ?? "").trim() || null;
      let printifyOk = false;
      if (tokenSet) {
        try {
          shopId = await resolveShopId();
          printifyOk = Boolean(shopId);
        } catch {
          printifyOk = false;
        }
      }
      const db = dbConfig();
      let qikinkTokenOk = false;
      try {
        await qikinkGetToken();
        qikinkTokenOk = true;
      } catch {
        qikinkTokenOk = false;
      }
      return json({
        status: "ok",
        printify_token_set: tokenSet,
        printify_shop_id: shopId,
        printify_reachable: printifyOk,
        db_configured: Boolean(db),
        webhook_secret_set: Boolean((Deno.env.get("PRINTIFY_WEBHOOK_SECRET") ?? "").trim()),
        qikink_client_id_set: Boolean((Deno.env.get("QIKINK_CLIENT_ID") ?? "").trim()),
        qikink_base_url: QIKINK_BASE_URL(),
        qikink_token_ok: qikinkTokenOk,
        qikink_webhook_secret_set: Boolean((Deno.env.get("QIKINK_WEBHOOK_SECRET") ?? "").trim()),
        time: new Date().toISOString(),
      });
    }

    // ---- public route: checkout (guest orders → Printify routing) ------------
    if (route === "checkout.submit") {
      return await handleCheckoutSubmit(body);
    }

    // ---- everything below requires the admin ---------------------------------
    const admin = await isAdminRequest(request);
    if (!admin.ok) {
      return errorResponse("admin authorization required", 401, { email: admin.email });
    }

    switch (route) {
      case "catalog.blueprints":
        return json(await listBlueprints());

      case "catalog.providers": {
        const bp = Number(body.blueprint_id ?? DEFAULT_BLUEPRINT_ID);
        return json(await listPrintProviders(bp));
      }

      case "catalog.variants": {
        const bp = Number(body.blueprint_id ?? DEFAULT_BLUEPRINT_ID);
        const pp = Number(body.print_provider_id ?? DEFAULT_PRINT_PROVIDER_ID);
        return json(await listVariants(bp, pp));
      }

      case "products.createAop": {
        const title = String(body.title ?? "").trim();
        const imageUrl = String(body.design_image_url ?? "").trim();
        const sku = String(body.storefront_sku ?? "").trim();
        if (!title) return errorResponse("'title' is required", 400);
        if (!imageUrl) return errorResponse("'design_image_url' is required", 400);
        if (!sku) return errorResponse("'storefront_sku' is required", 400);

        const result = await createAopProduct({
          title,
          description: String(body.description ?? ""),
          design_image_url: imageUrl,
          image_file_name: body.image_file_name ? String(body.image_file_name) : undefined,
          blueprint_id: body.blueprint_id ? Number(body.blueprint_id) : undefined,
          print_provider_id: body.print_provider_id ? Number(body.print_provider_id) : undefined,
          retail_price_usd: body.retail_price_usd != null ? Number(body.retail_price_usd) : undefined,
          enabled_variants: Array.isArray(body.enabled_variants)
            ? (body.enabled_variants as unknown[]).map(Number)
            : undefined,
          variant_prices: (body.variant_prices ?? undefined) as Record<string, number> | undefined,
          tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
          publish: Boolean(body.publish),
          shop_id: body.shop_id ? String(body.shop_id) : undefined,
          storefront_sku: sku,
        });

        try {
          await saveProductMapping(result, sku);
        } catch (err) {
          console.error("product mapping persistence failed:", err);
          return json({ ...result, persisted: false, persistence_error: String(err) }, 201);
        }
        return json({ ...result, persisted: true }, 201);
      }

      case "shipping.quote": {
        const lineItems = Array.isArray(body.line_items)
          ? (body.line_items as Array<Record<string, unknown>>).map((item) => ({
              product_id: String(item.product_id ?? ""),
              variant_id: Number(item.variant_id ?? 0),
              quantity: Number(item.quantity ?? 1),
            }))
          : [];
        const country = String(body.country ?? "").trim();
        if (!lineItems.length) return errorResponse("'line_items' is required", 400);
        if (!country) return errorResponse("'country' is required", 400);
        return json({
          options: await quoteShipping({
            line_items: lineItems,
            country,
            region: body.region ? String(body.region) : undefined,
            city: body.city ? String(body.city) : undefined,
            zip: body.zip ? String(body.zip) : undefined,
            shop_id: body.shop_id ? String(body.shop_id) : undefined,
          }),
        });
      }

      case "orders.create": {
        const externalId = String(body.external_order_id ?? "").trim();
        const lineItems = Array.isArray(body.line_items)
          ? (body.line_items as Array<Record<string, unknown>>).map((item) => ({
              product_id: String(item.product_id ?? ""),
              variant_id: Number(item.variant_id ?? 0),
              quantity: Number(item.quantity ?? 1),
            }))
          : [];
        const shippingAddress = (body.shipping_address ?? {}) as Record<string, string | undefined>;
        if (!externalId) return errorResponse("'external_order_id' is required", 400);
        if (!lineItems.length) return errorResponse("'line_items' is required", 400);

        const printify = (await createProductionOrder({
          external_order_id: externalId,
          line_items: lineItems,
          shipping_address: shippingAddress,
          shipping_method: body.shipping_method != null ? Number(body.shipping_method) : undefined,
          send_shipping_notification: body.send_shipping_notification !== false,
          label: body.label ? String(body.label) : undefined,
          shop_id: body.shop_id ? String(body.shop_id) : undefined,
        })) as Record<string, unknown>;

        try {
          const saved = await saveOrderRecord({ external_order_id: externalId, printify });
          return json({ printify_order: printify, db_record: saved }, 201);
        } catch (err) {
          console.error("order persistence failed:", err);
          return json({ printify_order: printify, persisted: false, persistence_error: String(err) }, 201);
        }
      }

      case "catalog.syncProducts": {
        // Pull every visible Printify product into the storefront catalog so
        // POD items created on Printify become buyable on kiyumi.online.
        const sync = await syncPrintifyProducts();
        return json(sync);
      }

      case "db.mappings": {
        // The printify_* tables are RLS-locked (no public policies), so the
        // admin UI reads them through here with the service role.
        const rows = await dbList("printify_products", "created_at.desc", 50);
        return json({ rows });
      }

      case "db.orders": {
        const rows = await dbList("printify_orders", "created_at.desc", 50);
        return json({ rows });
      }

      case "db.qikinkOrders": {
        // Qikink-tracked storefront orders: pushed (any state) or failed syncs.
        const rows = (await dbList("orders", "created_at.desc", 100)).filter(
          (o) => o.qikink_order_id || o.fulfillment_status === "failed",
        );
        return json({ rows });
      }

      case "qikink.retry": {
        const orderId = String(body.order_id ?? "").trim();
        if (!orderId) return errorResponse("'order_id' is required", 400);
        const order = await dbSelectOne("orders", `id=eq.${orderId}`);
        if (!order) return errorResponse("order not found", 404);
        const result = await pushOrderToQikink(order, { dryRun: Boolean(body.dry_run) });
        return json(result, result.ok ? 200 : 422);
      }

      case "qikink.syncStatus": {
        // Pull Qikink's order list and reconcile status/tracking into orders.
        const remote = (await qikinkRequest("GET", "/api/order")) as unknown;
        if (!Array.isArray(remote)) {
          return json({ checked: 0, updated: [], note: "unexpected response shape" });
        }
        const ours = (await dbList("orders", "created_at.desc", 200)).filter((o) => o.qikink_order_id);
        const byQikinkId = new Map(ours.map((o) => [String(o.qikink_order_id), o]));
        const updated: Array<Record<string, unknown>> = [];
        for (const row of remote as Array<Record<string, unknown>>) {
          const id = pickStr(row, ["order_number", "ordernumber", "order_id", "orderid", "shopify_order_id"]);
          const order = byQikinkId.get(id);
          if (!order) continue;
          const status = normalizeQikinkStatus(pickStr(row, ["status", "order_status"]));
          const trackingNumber = pickStr(row, ["awb", "tracking_number", "tracking_id", "tracking"]);
          const courier = pickStr(row, ["courier", "courier_name", "carrier"]);
          const patch: Record<string, unknown> = {};
          if (status && status !== order.fulfillment_status) patch.fulfillment_status = status;
          if (trackingNumber && trackingNumber !== order.tracking_number) {
            patch.tracking_number = trackingNumber;
            patch.courier = courier || null;
          }
          if ((status === "shipped" || status === "delivered") && order.status !== "fulfilled") {
            patch.status = "fulfilled";
          }
          if (!Object.keys(patch).length) continue;
          await dbUpdate("orders", `id=eq.${order.id}`, patch);
          updated.push({ order_id: order.id, qikink_order_id: id, applied: patch });
        }
        return json({ remote_count: remote.length, checked: ours.length, updated });
      }

      case "qikink.webhookUrl": {
        // Admin helper: the full webhook URL including its secret query param,
        // ready to paste into the Qikink dashboard as the Webhook URL.
        const secret = (Deno.env.get("QIKINK_WEBHOOK_SECRET") ?? "").trim();
        let webhookUrl =
          "https://wnqfdmbypygvrdanosqx.supabase.co/functions/v1/printify-fulfillment/qikink/webhook";
        if (secret) webhookUrl += `?token=${encodeURIComponent(secret)}`;
        return json({ url: webhookUrl, secret_set: Boolean(secret) });
      }

      case "orders.sendToProduction": {
        const shop = await resolveShopId(body.shop_id ? String(body.shop_id) : undefined);
        const orderId = String(body.order_id ?? "").trim();
        if (!orderId) return errorResponse("'order_id' is required", 400);
        const result = await printifyRequest(
          "POST",
          `/shops/${shop}/orders/${orderId}/send_to_production.json`,
        );
        try {
          await dbUpdate("printify_orders", `printify_order_id=eq.${orderId}`, {
            status: "sent_to_production",
          });
        } catch (err) {
          console.error("status update failed:", err);
        }
        return json(result);
      }

      case "webhooks.register": {
        const shop = await resolveShopId(body.shop_id ? String(body.shop_id) : undefined);
        const topic = String(body.topic ?? "order:shipment:created");
        const baseUrl = String(body.public_base_url ?? "https://kiyumi.online").replace(/\/+$/, "");
        const secret = (Deno.env.get("PRINTIFY_WEBHOOK_SECRET") ?? "").trim();
        let hookUrl = `${baseUrl}/functions/v1/printify-fulfillment/webhook`;
        if (secret) hookUrl += `?secret=${encodeURIComponent(secret)}`;

        const hooks = (await printifyRequest("GET", `/shops/${shop}/webhooks.json`)) as Array<{
          id: string | number;
          topic: string;
          url: string;
        }>;
        const existing = hooks.find((h) => h.topic === topic && h.url === hookUrl);
        if (existing) {
          return json({
            webhook_id: String(existing.id),
            topic,
            url: hookUrl,
            already_registered: true,
          });
        }
        const created = (await printifyRequest("POST", `/shops/${shop}/webhooks.json`, {
          topic,
          url: hookUrl,
        })) as { id?: string | number };
        return json({ webhook_id: String(created.id), topic, url: hookUrl, already_registered: false });
      }

      default:
        return errorResponse(`unknown route: ${route}`, 400, {
          routes: [
            "health",
            "catalog.blueprints",
            "catalog.providers",
            "catalog.variants",
            "catalog.syncProducts",
            "products.createAop",
            "shipping.quote",
            "orders.create",
            "orders.sendToProduction",
            "webhooks.register",
            "qikink.retry",
            "qikink.syncStatus",
            "qikink.webhookUrl",
            "db.qikinkOrders",
          ],
        });
    }
  } catch (err) {
    if (err instanceof PrintifyError) {
      const status = err.status && err.status >= 400 && err.status < 500 ? 400 : 502;
      return errorResponse(err.message, status);
    }
    console.error("unhandled error:", err);
    return errorResponse(err instanceof Error ? err.message : String(err), 500);
  }
});
