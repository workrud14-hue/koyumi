# KIYUMI — Printify Fulfillment Backend

Server-side service for **automated product creation (AOP)**, **order
submission**, and **shipment webhook handling** on kiyumi.online.

## ⚠️ Production deployment: Supabase Edge Function

The static host (Vercel) serves only the Vite build — Python API routes are
not routed there. The **production backend is the Supabase Edge Function**:

- Source: `supabase/functions/printify-fulfillment/index.ts` (single-file Deno
  port of this entire `api/` module — same routes, same behavior)
- Live URL: `https://wnqfdmbypygvrdanosqx.supabase.co/functions/v1/printify-fulfillment`
- Deploy + set secrets: `node scripts/deploy-printify-function.mjs`
  (uses the Management API — no CLI/Docker needed)
- **Verified live** (Sep 2026): health, admin auth gating, webhook secret
  gating, E2E draft AOP product creation + DB persistence, live shipping
  quotes (IN: `{standard: 1249}`, US: `{standard: 609, express: 2899,
  priority: 2899}`), and webhook registration on Printify.

### Calling the function

All POSTs take `{"route": "...", ...}` JSON bodies.
- `health` — public
- `checkout.submit` — **public**: guest checkout. Body: `{customer:{email,
  first_name,last_name,phone}, shipping_address:{address1,address2,city,
  region,zip,country}, items:[{sku,size,color,quantity,unit_price_cents}],
  currency, payment_status}`. Persists the order, maps SKUs→Printify
  variants, creates a draft Printify order, returns `{order_id, status,
  printify_order_id, unrouted[]}`.
- Admin routes (`catalog.*`, `products.createAop`, `shipping.quote`,
  `orders.create`, `orders.sendToProduction`, `db.mappings`, `db.orders`,
  `webhooks.register`, `qikink.retry`, `qikink.syncStatus`,
  `qikink.webhookUrl`, `db.qikinkOrders`) require
  `Authorization: Bearer <supabase access token>` of the admin email
- Webhook: `GET|POST .../webhook?secret=...` (registered on Printify)
- Qikink webhook: `GET|POST .../qikink/webhook?token=...` (paste into Qikink
  dashboard; copy the full URL from Admin → Fulfillment → COPY WEBHOOK URL)

The Python module below is kept as the reference implementation / local dev
alternative (runs under the Freebuff Python API runner when the platform
routes `api/*.py`).

## Files

| File | Role |
|---|---|
| `supabase/functions/printify-fulfillment/index.ts` | **PRODUCTION** — Edge Function (Deno) |
| `scripts/deploy-printify-function.mjs` | Deploy + secrets via Management API |
| `api/printify_client.py` | Reference: authenticated Printify REST wrapper |
| `api/printify_service.py` | Reference: AOP layout builder, shipping quote, order submit, webhook parser |
| `api/app.py` | Reference: Flask routes |
| `api/supabase_db.py` | Reference: service-role persistence into `printify_*` tables |
| `api/run.py` | Local dev entrypoint for the Python variant |
| `supabase/printify_schema.sql` | DB schema — already applied to the live project |

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `PRINTIFY_API_TOKEN` | ✅ | Personal access token (already provisioned) |
| `PRINTIFY_SHOP_ID` | recommended | Default `28915362` (auto-detected if unset) |
| `PRINTIFY_BLUEPRINT_ID` | optional | Default `281` — Unisex Cut & Sew Tee (AOP) |
| `PRINTIFY_PROVIDER_ID` | optional | Default `10` — MWW On Demand |
| `SUPABASE_URL` | ✅ | e.g. `https://wnqfdmbypygvrdanosqx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ | service_role JWT — **never** in browser code |
| `ADMIN_EMAIL` | optional | Default `workrud14@gmail.com` |
| `PRINTIFY_WEBHOOK_SECRET` | recommended | Shared secret gating the webhook URL |

## Verified live catalog facts (used as defaults)

- Shop: `28915362` — "My new store" (custom integration)
- Blueprint `281` = **Unisex Cut & Sew Tee (AOP)**, provider `10` = MWW On Demand
- Blueprint `450` = Unisex Pullover Hoodie (AOP), `433` = Men's Bomber Jacket (AOP)
- Tee variants: `43100`–`43123` (2 stitching colors × 2 weights × S–3XL)
- AOP placeholder positions: `front`, `back`, `left_sleeve`, `right_sleeve`
  (pixel dims vary **per size** — the layout builder reads them live)

## API surface

### Health
`GET /api/printify/health` → `{status, shop_id}`

### Workflow 1 — Product creation (admin)
`GET /api/printify/catalog/blueprints` — list AOP blueprints
`GET /api/printify/catalog/blueprints/281/providers` — providers
`GET /api/printify/catalog/blueprints/281/providers/10/variants` — variants + placeholders

`POST /api/printify/products/create-aop`
```json
{
  "title": "Kitsune Protocol AOP Tee",
  "description": "All-over fox-spirit print, cut & sew.",
  "design_image_url": "https://.../pattern.png",
  "sku": "KY-AOP-001",
  "retail_price_usd": 78,
  "variant_prices": {"43108": 82, "43109": 82},
  "publish": false
}
```

Pricing note: Printify's catalog does not expose base costs via API, so
`retail_price_usd` sets the price for **every** variant; per-variant overrides
come via `variant_prices` (variant id → price in dollars).
→ `201 {printify_product_id, blueprint_id, print_provider_id, image_id,
variants: [...], printify_product_url}` and the mapping is persisted to
`printify_products`.

### Workflow 2 — Order routing
`POST /api/printify/shipping/quote`
```json
{
  "line_items": [{"product_id": "123", "variant_id": 43108, "quantity": 1}],
  "country": "GB", "city": "London", "zip": "E1 6AN"
}
```
→ `{options: [...]}` — live rates per provider (standard/express).

`POST /api/printify/orders/create`
```json
{
  "external_order_id": "KYM-10231",
  "line_items": [{"product_id": "123", "variant_id": 43108, "quantity": 1}],
  "shipping_address": {
    "first_name": "A.", "last_name": "Nakamura",
    "email": "a@example.com", "phone": "+44...",
    "country": "GB", "region": "Greater London",
    "city": "London", "address1": "1 Main St", "zip": "E1 6AN"
  },
  "send_shipping_notification": true
}
```
→ `201 {id, status, total_price, ...}` — persisted to `printify_orders`.

`POST /api/printify/orders/<printify_order_id>/send-to-production` (admin)

### Workflow 3 — Webhook listener
`POST /api/printify/webhooks/printify` — Printify posts here on
`order:shipment:created`. Extracts tracking number/URL/carrier, flips the
order to `fulfilled`, stores shipment rows, and logs the raw event to
`printify_events`. Never 5xx's on DB hiccups (webhook semantics).

`POST /api/printify/webhooks/register` (admin) — registers the webhook on
Printify pointing at this route:
```json
{"public_base_url": "https://kiyumi.online"}
```

### Qikink POD integration (IND orders)

Orders whose items reference a product with `products.qikink_sku` set are
**auto-pushed to Qikink** right after `checkout.submit` persists them (Qikink
India Print-on-Demand: `https://api.qikink.com`, token auth, `/api/order/create`).

- `qikink.retry` — re-push an order (`{"order_id", "dry_run"}`); failures mark
  `orders.fulfillment_status = 'failed'` with `qikink_sync_error`, retryable
  from Admin → Fulfillment.
- `qikink.syncStatus` — pull Qikink's order list and reconcile
  status/tracking/AWB into `orders`.
- `qikink.webhookUrl` — full webhook URL including its `?token=` secret.
- `db.qikinkOrders` — storefront orders tracked through Qikink.
- Qikink webhook `.../qikink/webhook?token=...` — flips orders to SHIPPED with
  tracking + courier and triggers the shipping email.

Secrets: `QIKINK_CLIENT_ID`, `QIKINK_CLIENT_SECRET`, `QIKINK_BASE_URL`,
`QIKINK_WEBHOOK_SECRET` (set as function secrets + sandbox `.env.local`).

## Setup checklist — DONE ✅ (Sep 2026)

1. ~~Run `supabase/printify_schema.sql`~~ — applied via Management API
   (`scripts/apply-printify-schema.mjs`); 4 tables live, RLS-locked.
2. ~~Provision env/secrets~~ — function secrets set: `PRINTIFY_API_TOKEN`,
   `PRINTIFY_WEBHOOK_SECRET` (`SUPABASE_URL` + service key are auto-injected).
3. ~~Deploy~~ — function is ACTIVE (version 3+); health returns
   `shop_id 28915362, printify_reachable: true, db_configured: true`.
4. ~~Register the webhook~~ — Printify webhook `6aa670af9ea14bb1d4066355`
   (`order:shipment:created`) points at the function's `/webhook` route with
   the secret query param.
5. Remaining human test: place a real order → confirm the shipment webhook
   flips `printify_orders.status` to `fulfilled` with tracking stored.

## Security notes

- The Printify token lives **only** in server env — never in the React bundle.
- Admin routes verify the Supabase session email against `ADMIN_EMAIL`.
- Webhook route is gated by a shared secret because Printify does not sign
  webhooks; use a long random value and pass it as `?secret=` in the
  registered URL.
- `printify_*` tables have RLS enabled with **no public policies** — only the
  service-role key used by this backend can touch them.
