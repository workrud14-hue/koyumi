"""
KIYUMI — Flask application factory (Printify fulfillment backend)
=================================================================
Exposes:

  GET  /api/printify/health                        → service + token check
  GET  /api/printify/catalog/blueprints            → AOP blueprint discovery
  GET  /api/printify/catalog/blueprints/<bp>/providers
  GET  /api/printify/catalog/blueprints/<bp>/providers/<pp>/variants
  POST /api/printify/products/create-aop           → Workflow 1 (admin)
  POST /api/printify/shipping/quote                → Workflow 2.1
  POST /api/printify/orders/create                 → Workflow 2.2
  POST /api/printify/orders/<id>/send-to-production
  POST /api/printify/webhooks/printify             → Workflow 3 (Printify → us)
  POST /api/printify/webhooks/register             → register webhook (admin)

Admin routes require a valid Supabase access token belonging to the admin
email (ADMIN_EMAIL env, default workrud14@gmail.com). Webhook route is
protected by the WEBHOOK_SECRET shared value (configurable; Printify does
not sign webhooks, so we gate via secret URL segment/header).
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import requests
from flask import Flask, jsonify, request

from printify_client import PrintifyError, list_blueprints, list_print_providers, list_variants
from printify_service import (
    create_production_order,
    create_aop_product,
    parse_shipment_webhook,
    quote_shipping,
    register_shipment_webhook,
)
from supabase_db import (
    log_fulfillment_event,
    save_printify_product_mapping,
    save_printify_order,
    mark_order_shipped,
    get_order_by_external_id,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("kiyumi.printify.app")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "workrud14@gmail.com").lower()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
WEBHOOK_SECRET = os.environ.get("PRINTIFY_WEBHOOK_SECRET", "")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def _admin_authorized() -> bool:
    """
    Validate the caller is the store admin.

    Accepts `Authorization: Bearer <supabase_access_token>` and verifies it
    against Supabase /auth/v1/user. Falls back to allow-listing when no
    Supabase credentials are configured (e.g. local smoke tests).
    """
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return False
    token = header.split(" ", 1)[1].strip()

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            response = requests.get(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {token}",
                },
                timeout=10,
            )
            if response.status_code != 200:
                return False
            email = (response.json() or {}).get("email", "").lower()
            return email == ADMIN_EMAIL
        except requests.RequestException as exc:
            log.warning("Supabase user lookup failed: %s", exc)
            return False

    # No Supabase configured: treat any token as trusted (local dev only).
    log.warning("SUPABASE_URL/SERVICE_KEY not set — admin check bypassed (dev mode).")
    return True


def _webhook_authorized() -> bool:
    """Printify webhooks are not signed; gate via shared secret in URL/header."""
    if not WEBHOOK_SECRET:
        return True  # dev mode; log loudly
    provided = (
        request.args.get("secret")
        or request.headers.get("X-Webhook-Secret")
        or ""
    )
    return provided == WEBHOOK_SECRET


def _json_body() -> Dict[str, Any]:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _error(message: str, status: int = 400, details: Any = None):
    body: Dict[str, Any] = {"error": message}
    if details is not None:
        body["details"] = details
    return jsonify(body), status


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> Flask:
    app = Flask(__name__)

    # ------------------------------------------------------------- health
    @app.get("/api/printify/health")
    def health():
        from printify_client import resolve_shop_id

        try:
            shop_id = resolve_shop_id()
            return jsonify({"status": "ok", "shop_id": shop_id})
        except PrintifyError as exc:
            return jsonify({"status": "degraded", "error": str(exc)}), 200

    # ------------------------------------------------- Workflow 1: catalog
    @app.get("/api/printify/catalog/blueprints")
    def catalog_blueprints():
        try:
            blueprints = list_blueprints()
            aop = [b for b in blueprints if "aop" in (b.get("title") or "").lower()]
            return jsonify({"count": len(aop), "blueprints": aop})
        except PrintifyError as exc:
            return _error(str(exc), 502)

    @app.get("/api/printify/catalog/blueprints/<int:bp_id>/providers")
    def catalog_providers(bp_id: int):
        try:
            return jsonify({"providers": list_print_providers(bp_id)})
        except PrintifyError as exc:
            return _error(str(exc), 502)

    @app.get("/api/printify/catalog/blueprints/<int:bp_id>/providers/<int:pp_id>/variants")
    def catalog_variants(bp_id: int, pp_id: int):
        try:
            payload = list_variants(bp_id, pp_id)
            variants = payload.get("variants") or []
            return jsonify(
                {
                    "print_provider": {"id": payload.get("id"), "title": payload.get("title")},
                    "variant_count": len(variants),
                    "variants": variants,
                }
            )
        except PrintifyError as exc:
            return _error(str(exc), 502)

    # ----------------------------- Workflow 1: AOP product creation (admin)
    @app.post("/api/printify/products/create-aop")
    def products_create_aop():
        if not _admin_authorized():
            return _error("Admin authorization required", 401)

        body = _json_body()
        title = (body.get("title") or "").strip()
        design_url = (body.get("design_image_url") or "").strip()
        if not title:
            return _error("'title' is required")
        if not design_url:
            return _error("'design_image_url' (public URL of the pattern) is required")

        try:
            result = create_aop_product(
                title=title,
                description=body.get("description") or "",
                design_image_url=design_url,
                image_file_name=body.get("image_file_name"),
                blueprint_id=body.get("blueprint_id"),
                print_provider_id=body.get("print_provider_id"),
                retail_price_usd=float(body.get("retail_price_usd", 49.0)),
                enabled_variants=body.get("enabled_variants"),
                variant_prices=body.get("variant_prices"),
                tags=body.get("tags"),
                publish=bool(body.get("publish", False)),
                shop_id=body.get("shop_id"),
            )
        except (PrintifyError, ValueError) as exc:
            log.exception("AOP product creation failed")
            status = getattr(exc, "status_code", None)
            return _error(str(exc), 502 if status else 400)

        # Persist the mapping for order routing (best effort — don't fail the
        # request if the DB write hiccups; the mapping can be backfilled).
        try:
            save_printify_product_mapping(
                storefront_sku=body.get("sku") or f"KY-PF-{result['printify_product_id']}",
                product_id=result["printify_product_id"],
                blueprint_id=result["blueprint_id"],
                print_provider_id=result["print_provider_id"],
                image_id=result["image_id"],
                variants=result["variants"],
                shop_id=result["shop_id"],
            )
        except Exception as exc:  # noqa: BLE001 — persistence must not 500 the API
            log.error("Failed to persist product mapping: %s", exc)
            result["warning"] = "product created but mapping persistence failed"

        return jsonify(result), 201

    # ----------------------------- Workflow 2.1: shipping rates
    @app.post("/api/printify/shipping/quote")
    def shipping_quote():
        body = _json_body()
        line_items = body.get("line_items") or []
        country = (body.get("country") or "").strip()
        if not line_items:
            return _error("'line_items' ([{product_id, variant_id, quantity}]) is required")
        if not country:
            return _error("'country' (ISO-2 code) is required")

        try:
            options = quote_shipping(
                line_items=line_items,
                country=country,
                region=body.get("region"),
                city=body.get("city"),
                zip_code=body.get("zip"),
                shop_id=body.get("shop_id"),
            )
            return jsonify({"options": options})
        except (PrintifyError, ValueError) as exc:
            log.exception("Shipping quote failed")
            return _error(str(exc), 502)

    # ----------------------------- Workflow 2.2: order submission
    @app.post("/api/printify/orders/create")
    def orders_create():
        body = _json_body()
        external_id = (body.get("external_order_id") or "").strip()
        line_items = body.get("line_items") or []
        address = body.get("shipping_address") or {}

        if not external_id:
            return _error("'external_order_id' (storefront order id) is required")
        if not line_items:
            return _error("'line_items' ([{product_id, variant_id, quantity}]) is required")
        if not isinstance(address, dict) or not address:
            return _error("'shipping_address' object is required")

        try:
            order = create_production_order(
                external_order_id=external_id,
                line_items=line_items,
                shipping_address=address,
                shipping_method=int(body.get("shipping_method", 1)),
                send_shipping_notification=bool(body.get("send_shipping_notification", True)),
                label=body.get("label"),
                shop_id=body.get("shop_id"),
            )
        except (PrintifyError, ValueError) as exc:
            log.exception("Order submission failed")
            return _error(str(exc), 502)

        try:
            save_printify_order(
                external_order_id=external_id,
                printify_order_id=str(order.get("id")),
                status=order.get("status"),
                total_price_cents=order.get("total_price"),
                total_shipping_cents=order.get("total_shipping"),
                shipping_method=body.get("shipping_method", 1),
                raw=order,
            )
        except Exception as exc:  # noqa: BLE001
            log.error("Order created but DB persistence failed: %s", exc)

        return jsonify(order), 201

    @app.post("/api/printify/orders/<order_id>/send-to-production")
    def orders_send_to_production(order_id: str):
        if not _admin_authorized():
            return _error("Admin authorization required", 401)
        from printify_client import resolve_shop_id, send_order_to_production

        try:
            shop = resolve_shop_id(request.args.get("shop_id"))
            return jsonify(send_order_to_production(shop, order_id))
        except PrintifyError as exc:
            return _error(str(exc), 502)

    # ----------------------------- Workflow 3: webhook listener
    @app.post("/api/printify/webhooks/printify")
    def webhooks_receive():
        if not _webhook_authorized():
            return _error("Webhook authorization failed", 401)

        payload = _json_body()
        event_type = payload.get("type") or payload.get("event") or "unknown"
        parsed = parse_shipment_webhook(payload) if "shipment" in event_type else None

        if parsed is None:
            log.info("Ignoring non-shipment webhook event: %s", event_type)
            return jsonify({"received": True, "handled": False, "event": event_type})

        order_id = parsed.get("order_id")
        external_id = parsed.get("external_order_id")
        shipments = parsed.get("shipments") or []

        log.info(
            "Shipment webhook: order=%s external=%s shipments=%s",
            order_id, external_id, shipments,
        )

        updated = False
        try:
            record = None
            if external_id:
                record = get_order_by_external_id(external_id)
            if record is None and order_id:
                record = get_order_by_external_id(order_id)  # fallback match

            if record is not None:
                mark_order_shipped(
                    record_id=record["id"],
                    printify_order_id=order_id,
                    shipments=shipments,
                )
                updated = True
            log_fulfillment_event(
                order_id=order_id,
                external_order_id=external_id,
                event=event_type,
                payload=payload,
            )
        except Exception as exc:  # noqa: BLE001 — never 500 a webhook
            log.exception("Webhook persistence failed: %s", exc)

        return jsonify(
            {
                "received": True,
                "handled": parsed is not None,
                "order_id": order_id,
                "external_order_id": external_id,
                "db_updated": updated,
                "shipments": shipments,
            }
        )

    @app.post("/api/printify/webhooks/register")
    def webhooks_register():
        if not _admin_authorized():
            return _error("Admin authorization required", 401)
        body = _json_body()
        base_url = (body.get("public_base_url") or "").strip()
        if not base_url:
            return _error("'public_base_url' (e.g. https://kiyumi.online) is required")
        try:
            result = register_shipment_webhook(
                public_base_url=base_url,
                topic=body.get("topic", "order:shipment:created"),
                shop_id=body.get("shop_id"),
            )
            return jsonify(result), 201
        except PrintifyError as exc:
            return _error(str(exc), 502)

    # ------------------------------------------------------------- errors
    @app.errorhandler(404)
    def not_found(_):
        return _error("Not found", 404)

    @app.errorhandler(500)
    def internal_error(_):
        return _error("Internal server error", 500)

    return app


app = create_app()
