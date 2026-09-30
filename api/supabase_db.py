"""
KIYUMI — Supabase persistence helpers (service role)
====================================================
Server-side DB access for the fulfillment backend. Uses the Supabase REST API
(PostgREST) directly with the service-role key, so no extra SDK is needed in
the Python runtime.

Expected env:
  SUPABASE_URL           e.g. https://wnqfdmbypygvrdanosqx.supabase.co
  SUPABASE_SERVICE_KEY   service_role JWT (NEVER expose to the browser)

Tables (see supabase/printify_schema.sql):
  printify_products        storefront SKU → Printify product/variant mapping
  printify_orders          storefront order → Printify order + status
  printify_shipments       tracking rows per shipment (from webhook)
  printify_events          raw webhook/event audit log
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger("kiyumi.printify.db")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TIMEOUT = int(os.environ.get("SUPABASE_DB_TIMEOUT_SECONDS", "15"))


class DBError(Exception):
    pass


def _headers(prefer_return: str = "representation") -> Dict[str, str]:
    if not SUPABASE_URL or not SERVICE_KEY:
        raise DBError(
            "SUPABASE_URL / SUPABASE_SERVICE_KEY are not configured — cannot persist."
        )
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": f"return={prefer_return}",
    }
    return headers


def _insert(table: str, row: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=_headers(),
        json=row,
        timeout=TIMEOUT,
    )
    if response.status_code not in (200, 201):
        raise DBError(f"insert into {table} failed (HTTP {response.status_code}): {response.text[:300]}")
    data = response.json()
    return data[0] if isinstance(data, list) and data else {}


def _select(table: str, filters: str, single: bool = False) -> Optional[Dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    if single:
        url += "&select=*&limit=1"
    response = requests.get(url, headers=_headers(prefer_return="representation"), timeout=TIMEOUT)
    if response.status_code != 200:
        raise DBError(f"select from {table} failed (HTTP {response.status_code}): {response.text[:300]}")
    rows = response.json()
    if not rows:
        return None
    return rows[0] if single else rows


def _update(table: str, filters: str, patch: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}?{filters}",
        headers=_headers(),
        json=patch,
        timeout=TIMEOUT,
    )
    if response.status_code not in (200, 204):
        raise DBError(f"update {table} failed (HTTP {response.status_code}): {response.text[:300]}")
    try:
        return response.json()
    except ValueError:
        return []


# ---------------------------------------------------------------------------
# printify_products — SKU → Printify mapping
# ---------------------------------------------------------------------------

def save_printify_product_mapping(
    *,
    storefront_sku: str,
    product_id: str,
    blueprint_id: int,
    print_provider_id: int,
    image_id: str,
    variants: List[Dict[str, Any]],
    shop_id: str,
) -> Dict[str, Any]:
    """Insert or update the mapping for one storefront SKU."""
    payload = {
        "storefront_sku": storefront_sku,
        "printify_product_id": str(product_id),
        "blueprint_id": blueprint_id,
        "print_provider_id": print_provider_id,
        "image_id": str(image_id),
        "shop_id": str(shop_id),
        "variants": variants,
    }

    existing = _select(
        "printify_products",
        f"storefront_sku=eq.{storefront_sku}",
        single=True,
    )
    if existing:
        updated = _update(
            "printify_products",
            f"storefront_sku=eq.{storefront_sku}",
            {k: v for k, v in payload.items() if k != "storefront_sku"},
        )
        return updated[0] if updated else payload
    return _insert("printify_products", payload)


def get_variant_map_for_sku(storefront_sku: str) -> Optional[Dict[str, Any]]:
    return _select(
        "printify_products",
        f"storefront_sku=eq.{storefront_sku}",
        single=True,
    )


# ---------------------------------------------------------------------------
# printify_orders — order routing + status
# ---------------------------------------------------------------------------

def save_printify_order(
    *,
    external_order_id: str,
    printify_order_id: str,
    status: Optional[str],
    total_price_cents: Optional[int],
    total_shipping_cents: Optional[int],
    shipping_method: Optional[int],
    raw: Dict[str, Any],
) -> Dict[str, Any]:
    payload = {
        "external_order_id": str(external_order_id),
        "printify_order_id": str(printify_order_id),
        "status": status or "pending",
        "total_price_cents": total_price_cents,
        "total_shipping_cents": total_shipping_cents,
        "shipping_method": shipping_method,
        "raw_response": raw,
    }
    existing = _select(
        "printify_orders",
        f"external_order_id=eq.{external_order_id}",
        single=True,
    )
    if existing:
        updated = _update(
            "printify_orders",
            f"external_order_id=eq.{external_order_id}",
            payload,
        )
        return updated[0] if updated else payload
    return _insert("printify_orders", payload)


def get_order_by_external_id(external_order_id: str) -> Optional[Dict[str, Any]]:
    """Look up a local order row by external id OR by Printify order id."""
    row = _select(
        "printify_orders",
        f"external_order_id=eq.{external_order_id}",
        single=True,
    )
    if row:
        return row
    return _select(
        "printify_orders",
        f"printify_order_id=eq.{external_order_id}",
        single=True,
    )


def mark_order_shipped(
    *,
    record_id: str,
    printify_order_id: Optional[str],
    shipments: List[Dict[str, Any]],
) -> None:
    """Move an order to 'fulfilled' and persist shipment/tracking rows."""
    patch: Dict[str, Any] = {"status": "fulfilled"}
    if printify_order_id:
        patch["printify_order_id"] = str(printify_order_id)
    _update("printify_orders", f"id=eq.{record_id}", patch)

    primary = shipments[0] if shipments else {}
    for shipment in shipments:
        _insert(
            "printify_shipments",
            {
                "order_record_id": record_id,
                "tracking_number": shipment.get("tracking_number"),
                "tracking_url": shipment.get("tracking_url"),
                "carrier": shipment.get("carrier"),
                "shipped_at": shipment.get("shipped_at"),
            },
        )
    if primary:
        _update(
            "printify_orders",
            f"id=eq.{record_id}",
            {
                "tracking_number": primary.get("tracking_number"),
                "tracking_url": primary.get("tracking_url"),
                "carrier": primary.get("carrier"),
            },
        )


# ---------------------------------------------------------------------------
# printify_events — audit log
# ---------------------------------------------------------------------------

def log_fulfillment_event(
    *,
    order_id: Optional[str],
    external_order_id: Optional[str],
    event: str,
    payload: Dict[str, Any],
) -> None:
    _insert(
        "printify_events",
        {
            "event": event,
            "printify_order_id": order_id,
            "external_order_id": external_order_id,
            "payload": payload,
        },
    )
