"""
KIYUMI — Printify fulfillment service layer
===========================================
Implements the three fulfillment workflows over `printify_client`:

Workflow 1 — Programmatic All-Over-Print product creation
    upload_image_by_url → build aop print_areas from live blueprint
    placeholders → create product → (optional) publish

Workflow 2 — Dynamic order routing
    shipping rates quote → order creation (send_shipping_notification=True)

Workflow 3 — Fulfillment webhook payload parsing
    order.shipment.created → tracking number/url/carrier extraction

The heavy lifting (HTTP, retries, auth) lives in printify_client; this module
holds only orchestration and payload shaping.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, Iterable, List, Optional

from printify_client import (
    PrintifyError,
    create_order,
    create_product,
    create_webhook,
    get_shipping_rates,
    list_variants,
    publish_product,
    resolve_shop_id,
    send_order_to_production,
    upload_image_by_url,
)

log = logging.getLogger("kiyumi.printify.service")

# Default AOP blueprint / provider verified against the live catalog:
#   281 → Unisex Cut & Sew Tee (AOP)   [provider 10, MWW On Demand]
#   450 → Unisex Pullover Hoodie (AOP) [provider 10]
#   433 → Men's Bomber Jacket (AOP)    [provider 10]
DEFAULT_BLUEPRINT_ID = int(os.environ.get("PRINTIFY_BLUEPRINT_ID", "281"))
DEFAULT_PRINT_PROVIDER_ID = int(os.environ.get("PRINTIFY_PROVIDER_ID", "10"))

# Positions rendered for every AOP product. The placeholder metadata from the
# variants endpoint supplies per-size pixel dimensions at runtime, so this list
# only fixes the ordering/roles of the layers.
AOP_POSITIONS: tuple[str, ...] = ("back", "front", "left_sleeve", "right_sleeve")

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _slugify(name: str) -> str:
    return _SAFE_NAME.sub("-", (name or "design").strip())[:80] or "design"


def _as_int(value: Any, field: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f"'{field}' must be an integer, got: {value!r}")


# ---------------------------------------------------------------------------
# Workflow 1 — Programmatic AOP product creation
# ---------------------------------------------------------------------------

def build_aop_print_areas(
    image_id: str,
    variants_payload: Dict[str, Any],
    *,
    pattern_fill: bool = True,
) -> List[Dict[str, Any]]:
    """
    Build Printify `print_areas` for an All-Over-Print product.

    Printify's AOP layout expects one layer per placeholder position
    (front, back, left_sleeve, right_sleeve). For AOP, each layer is a
    *pattern* that fills the entire placeholder area — we set width/height to
    the placeholder's exact pixel dimensions and scale/anchor the image so the
    artwork tiles edge-to-edge (pattern_fill=True) rather than floating.

    `variants_payload` is the live response from
    /catalog/blueprints/{bp}/print_providers/{pp}/variants.json — placeholder
    dimensions vary per size, so they are read dynamically rather than
    hardcoded.
    """
    raw_variants = variants_payload.get("variants") or []
    if not raw_variants:
        raise PrintifyError(
            "Blueprint/provider has no variants — cannot build AOP print areas."
        )

    # Group placeholder dimensions by size (AOP placeholders only vary per size).
    dims_by_size: Dict[str, Dict[str, Dict[str, int]]] = {}
    for variant in raw_variants:
        options = variant.get("options") or {}
        size = str(options.get("size") or "default")
        for ph in variant.get("placeholders") or []:
            position = ph.get("position")
            if position in AOP_POSITIONS:
                dims_by_size.setdefault(size, {})[position] = {
                    "width": _as_int(ph.get("width"), "placeholder.width"),
                    "height": _as_int(ph.get("height"), "placeholder.height"),
                }

    # Build one print area per size (placeholder dimensions differ per size).
    # Structure: [{ variant_ids: [...], placeholders: [{position, images,
    #              width, height, pattern_fill}] }]
    # Map variant id → its size option (AOP placeholders only vary per size).
    size_by_variant: Dict[int, str] = {
        _as_int(v.get("id"), "variant.id"): str((v.get("options") or {}).get("size") or "")
        for v in raw_variants
    }

    areas_by_size: Dict[str, Dict[str, Any]] = {}
    for size, positions in dims_by_size.items():
        placeholders: List[Dict[str, Any]] = []
        for position in AOP_POSITIONS:
            dims = positions.get(position)
            if not dims:
                continue
            placeholders.append(
                {
                    "position": position,
                    "images": [
                        {
                            "id": image_id,
                            "x": 0.5,
                            "y": 0.5,
                            "scale": 1,
                            "angle": 0,
                        }
                    ],
                    # AOP pattern fills the whole placeholder area:
                    "width": dims["width"],
                    "height": dims["height"],
                    "pattern_fill": pattern_fill,
                }
            )
        if placeholders:
            areas_by_size[size] = {
                "variant_ids": [],
                "placeholders": placeholders,
            }

    if not areas_by_size:
        raise PrintifyError(
            "No AOP placeholders found for this blueprint/provider — cannot build print areas."
        )

    # Fan every variant id into the area matching its size.
    for variant in raw_variants:
        vid = _as_int(variant.get("id"), "variant.id")
        size = size_by_variant.get(vid, "")
        area = areas_by_size.get(size)
        if area is None:
            # Unknown size — fall back to the first area so no variant is lost.
            area = next(iter(areas_by_size.values()))
        area["variant_ids"].append(vid)

    cleaned = [a for a in areas_by_size.values() if a["variant_ids"]]
    if not cleaned:
        raise PrintifyError("Failed to construct AOP print areas for the given blueprint.")
    return cleaned


def create_aop_product(
    *,
    title: str,
    description: str,
    design_image_url: str,
    image_file_name: Optional[str] = None,
    blueprint_id: Optional[int] = None,
    print_provider_id: Optional[int] = None,
    retail_price_usd: float = 49.0,
    enabled_variants: Optional[Iterable[int]] = None,
    variant_prices: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    publish: bool = False,
    shop_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    End-to-end Workflow 1: upload design → build AOP layout → create product.

    Returns a dict with everything the caller needs for DB persistence:
      { printify_product_id, blueprint_id, print_provider_id, shop_id,
        image_id, variants: [{variant_id, title, price_cents, options}],
        printify_product_url }
    """
    shop = resolve_shop_id(shop_id)
    bp = blueprint_id or DEFAULT_BLUEPRINT_ID
    pp = print_provider_id or DEFAULT_PRINT_PROVIDER_ID

    # 1) Upload the design asset.
    file_name = _slugify(image_file_name or f"{title}.png")
    uploaded = upload_image_by_url(file_name, design_image_url)
    image_id = uploaded.get("id")
    if not image_id:
        raise PrintifyError("Printify did not return an image id after upload.")
    log.info("Uploaded design %s → image id %s", file_name, image_id)

    # 2) Fetch live variants + placeholders for this blueprint/provider.
    variants_payload = list_variants(bp, pp)
    all_variants = variants_payload.get("variants") or []

    # 3) Decide which variants are enabled; build variant list with prices.
    # NOTE: Printify's catalog variants endpoint does NOT return base costs
    # (cost/price are 0 for AOP blueprints), so retail pricing is set
    # explicitly: retail_price_usd for every variant, overridable per variant
    # via `variant_prices` ({"43108": 52.00, ...}). Prices are in cents.
    allowed: Optional[set[int]] = set(enabled_variants) if enabled_variants else None
    overrides = {
        _as_int(k, "variant_prices key"): int(round(float(v) * 100))
        for k, v in (variant_prices or {}).items()
    }
    default_price = int(round(retail_price_usd * 100))
    if default_price <= 0:
        raise ValueError("retail_price_usd must be greater than 0")

    product_variants: List[Dict[str, Any]] = []
    for variant in all_variants:
        vid = _as_int(variant.get("id"), "variant.id")
        if allowed is not None and vid not in allowed:
            continue
        price = overrides.get(vid, default_price)
        product_variants.append({"id": vid, "price": price})

    if not product_variants:
        raise PrintifyError("No variants selected — check enabled_variants input.")

    print_areas = build_aop_print_areas(str(image_id), variants_payload)

    # 4) Create the product.
    product_payload = {
        "title": title,
        "description": description,
        "blueprint_id": bp,
        "print_provider_id": pp,
        "variants": product_variants,
        "print_areas": print_areas,
        "tags": tags or ["kiyumi", "aop"],
    }
    created = create_product(shop, product_payload)

    product_id = str(created.get("id"))
    if publish:
        try:
            publish_product(shop, product_id)
        except PrintifyError as exc:
            log.warning("Product %s created but publish failed: %s", product_id, exc)

    return {
        "printify_product_id": product_id,
        "blueprint_id": bp,
        "print_provider_id": pp,
        "shop_id": shop,
        "image_id": str(image_id),
        "variants": [
            {
                "variant_id": v["id"],
                "price_cents": v["price"],
                "options": next(
                    (
                        var.get("options")
                        for var in all_variants
                        if _as_int(var.get("id"), "variant.id") == v["id"]
                    ),
                    {},
                ),
                "title": next(
                    (var.get("title") for var in all_variants if _as_int(var.get("id"), "variant.id") == v["id"]),
                    None,
                ),
            }
            for v in product_variants
        ],
        "printify_product_url": f"https://printify.com/app/products/{product_id}",
    }


# ---------------------------------------------------------------------------
# Workflow 2 — Dynamic order routing
# ---------------------------------------------------------------------------

def quote_shipping(
    *,
    line_items: List[Dict[str, Any]],
    country: str,
    region: Optional[str] = None,
    city: Optional[str] = None,
    zip_code: Optional[str] = None,
    shop_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Workflow 2.1 — live shipping rates for the cart.

    `line_items`: [{product_id, variant_id, quantity}]
    Returns the normalized list of shipping options with `id`, `price`
    (cents), `title`, `countries`, etc.
    """
    shop = resolve_shop_id(shop_id)
    address_to: Dict[str, Any] = {
        "first_name": "Quote",
        "last_name": "Request",
        "country": country.upper(),
    }
    if region:
        address_to["region"] = region
    if city:
        address_to["city"] = city
    if zip_code:
        address_to["zip"] = zip_code

    result = get_shipping_rates(shop, line_items, address_to)

    # Normalize the response to a flat list of options. Printify returns a
    # dict keyed by print provider ({"<provider_id>": {standard, express, ...}})
    # or a bare list, depending on API version.
    options: List[Dict[str, Any]] = []
    if isinstance(result, list):
        options = [o for o in result if isinstance(o, dict)]
    elif isinstance(result, dict):
        for provider_options in result.values():
            if isinstance(provider_options, dict):
                options.append(provider_options)
            elif isinstance(provider_options, list):
                options.extend(o for o in provider_options if isinstance(o, dict))
    return options


def create_production_order(
    *,
    external_order_id: str,
    line_items: List[Dict[str, Any]],
    shipping_address: Dict[str, Any],
    shipping_method: int = 1,
    send_shipping_notification: bool = True,
    label: Optional[str] = None,
    shop_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Workflow 2.2 — submit the production order to Printify.

    `shipping_address` keys: first_name, last_name, email?, phone?, country,
    region?, city, address1, address2?, zip.
    `line_items`: [{product_id, variant_id, quantity}] — variant ids MUST be
    Printify variant ids (from the DB mapping table, not storefront SKUs).
    Returns the Printify order payload ({id, status, total_price, ...}).
    """
    shop = resolve_shop_id(shop_id)

    address_to = {
        "first_name": shipping_address.get("first_name", ""),
        "last_name": shipping_address.get("last_name", ""),
        "email": shipping_address.get("email"),
        "phone": shipping_address.get("phone"),
        "country": (shipping_address.get("country") or "").upper(),
        "region": shipping_address.get("region"),
        "city": shipping_address.get("city"),
        "address1": shipping_address.get("address1"),
        "address2": shipping_address.get("address2"),
        "zip": shipping_address.get("zip"),
    }
    # Drop None values so Printify's strict schema isn't offended.
    address_to = {k: v for k, v in address_to.items() if v is not None}

    if not address_to.get("country"):
        raise ValueError("shipping_address.country is required (ISO-2 code).")
    if not address_to.get("address1"):
        raise ValueError("shipping_address.address1 is required.")
    if not address_to.get("zip") and address_to["country"] in {"US", "CA", "GB", "AU", "IN", "DE", "FR"}:
        raise ValueError(f"shipping_address.zip is required for {address_to['country']} orders.")

    order_payload: Dict[str, Any] = {
        "external_id": external_order_id,
        "label": label or f"kiyumi-{external_order_id}",
        "send_shipping_notification": send_shipping_notification,
        "line_items": [
            {
                "product_id": item["product_id"],
                "variant_id": _as_int(item["variant_id"], "variant_id"),
                "quantity": _as_int(item["quantity"], "quantity"),
            }
            for item in line_items
        ],
        "shipping_method": shipping_method,  # 1 = standard, 2 = express
        "address_to": address_to,
    }

    return create_order(shop, order_payload)


# ---------------------------------------------------------------------------
# Workflow 3 — Webhook payload parsing
# ---------------------------------------------------------------------------

CARRIER_URL_TEMPLATES: Dict[str, str] = {
    "usps": "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}",
    "ups": "https://www.ups.com/track?tracknum={tracking}",
    "fedex": "https://www.fedex.com/fedextrack/?trknbr={tracking}",
    "dhl": "https://www.dhl.com/en/express/tracking.html?AWB={tracking}",
    "dhl_ecommerce": "https://webtrack.dhlglobalmail.com/?trackingnumber={tracking}",
    "canada_post": "https://www.canadapost-postescanada.ca/track-reperage/en#/details/{tracking}",
    "royal_mail": "https://www.royalmail.com/track-your-item#!/tracking-results/{tracking}",
    "australia_post": "https://auspost.com.au/mypost/track/#/details/{tracking}",
}


def parse_shipment_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse an `order:shipment:created` (or `order.shipment.created`) webhook.

    Returns:
      { event, order_id, external_order_id, status, shipments: [
          { tracking_number, tracking_url, carrier, shipped_at } ] }
    """
    event = payload.get("type") or payload.get("event") or ""
    resource = payload.get("resource") or payload.get("data") or payload
    if isinstance(resource, list):
        resource = resource[0] if resource else {}

    order_id = resource.get("id")
    external_id = resource.get("external_id")
    status = resource.get("status")

    shipments: List[Dict[str, Any]] = []
    raw_shipments = resource.get("shipments") or []
    if isinstance(raw_shipments, dict):
        raw_shipments = [raw_shipments]

    for shipment in raw_shipments:
        number = (shipment.get("number") or shipment.get("tracking_number") or "").strip()
        carrier = (shipment.get("carrier") or "").strip().lower()
        url = shipment.get("url") or ""
        if not url and number:
            template = CARRIER_URL_TEMPLATES.get(carrier)
            url = template.format(tracking=number) if template else ""
        shipments.append(
            {
                "tracking_number": number,
                "tracking_url": url,
                "carrier": carrier,
                "shipped_at": shipment.get("shipped_at") or shipment.get("created_at"),
            }
        )

    return {
        "event": event,
        "order_id": str(order_id) if order_id is not None else None,
        "external_order_id": external_id,
        "status": status,
        "shipments": shipments,
    }


# ---------------------------------------------------------------------------
# Webhook registration helper (used by an admin endpoint)
# ---------------------------------------------------------------------------

def register_shipment_webhook(
    *,
    public_base_url: str,
    shop_id: Optional[str] = None,
    topic: str = "order:shipment:created",
) -> Dict[str, Any]:
    """Create the Printify webhook pointing at our listener route."""
    shop = resolve_shop_id(shop_id)
    # Gate the listener with the shared secret (Printify does not sign
    # webhooks): registered URL carries it as a query param when configured.
    secret = os.environ.get("PRINTIFY_WEBHOOK_SECRET", "").strip()
    url = f"{public_base_url.rstrip('/')}/api/printify/webhooks/printify"
    if secret:
        url = f"{url}?secret={secret}"
    existing = None
    try:
        from printify_client import list_webhooks

        for hook in list_webhooks(shop):
            if hook.get("topic") == topic and hook.get("url") == url:
                existing = hook
                break
    except PrintifyError:
        pass

    if existing:
        return {"webhook_id": str(existing.get("id")), "topic": topic, "url": url, "already_registered": True}

    created = create_webhook(shop, topic, url)
    return {"webhook_id": str(created.get("id")), "topic": topic, "url": url, "already_registered": False}
