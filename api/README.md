# KIYUMI — Printify Fulfillment Backend

Server-side service for **automated product creation (AOP)**, **order
submission**, and **shipment webhook handling** on kiyumi.online.

Runs on Freebuff hosting via the Python API runner (`api/*.py` +
`requirements.txt`). Flask + requests only — no heavy dependencies.

## Files

| File | Role |
|---|---|
| `api/printify_client.py` | Authenticated Printify REST wrapper (retries, timeouts, error typing) |
| `api/printify_service.py` | Workflow logic: AOP layout builder, shipping quote, order submit, webhook parser |
| `api/app.py` | Flask routes (the API surface) |
| `api/supabase_db.py` | Service-role persistence into `printify_*` tables |
| `api/run.py` | Local dev entrypoint |
| `supabase/printify_schema.sql` | DB schema — run once in the Supabase SQL editor |

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

## Setup checklist

1. Run `supabase/printify_schema.sql` in the Supabase SQL editor.
2. Env vars are provisioned (token, shop id, service key) in the Freebuff
   environment — see deploy env.
3. Deploy, then `GET /api/printify/health` → expect `{"status":"ok"}`.
4. Register the webhook via `/api/printify/webhooks/register` with the prod
   base URL (include `?secret=` matching `PRINTIFY_WEBHOOK_SECRET`).
5. Create one test AOP product → verify it appears in Printify → place a test
   order → confirm the webhook marks it fulfilled.

## Security notes

- The Printify token lives **only** in server env — never in the React bundle.
- Admin routes verify the Supabase session email against `ADMIN_EMAIL`.
- Webhook route is gated by a shared secret because Printify does not sign
  webhooks; use a long random value and pass it as `?secret=` in the
  registered URL.
- `printify_*` tables have RLS enabled with **no public policies** — only the
  service-role key used by this backend can touch them.
