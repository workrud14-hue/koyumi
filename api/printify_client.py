"""
KIYUMI — Printify API client
============================
Thin, typed wrapper over the Printify REST API used by the fulfillment
backend. The bearer token is read from the PRINTIFY_API_TOKEN environment
variable and is never hardcoded or logged.

Endpoints used
--------------
GET   /v1/shops.json                                        → list shops
GET   /v1/catalog/blueprints.json                           → blueprint catalog
GET   /v1/catalog/blueprints/{id}/print_providers.json      → providers per blueprint
GET   /v1/catalog/blueprints/{bp}/print_providers/{pp}/variants.json
                                                            → variants + AOP placeholders
POST  /v1/uploads/images.json                               → register image asset
POST  /v1/shops/{shop_id}/products.json                     → create product
POST  /v1/shops/{shop_id}/orders/shipping.json              → shipping rates quote
POST  /v1/shops/{shop_id}/orders.json                       → create order
POST  /v1/shops/{shop_id}/orders/{id}/send_to_production.json
POST  /v1/shops/{shop_id}/webhooks.json                     → register webhook

All calls raise PrintifyError on failure with the API error message embedded,
so route handlers can turn them into clean 4xx/5xx responses.
"""

from __future__ import annotations

import os
import time
import logging
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger("kiyumi.printify")

BASE_URL = os.environ.get("PRINTIFY_BASE_URL", "https://api.printify.com/v1")
DEFAULT_SHOP_ID = os.environ.get("PRINTIFY_SHOP_ID", "")
REQUEST_TIMEOUT = int(os.environ.get("PRINTIFY_TIMEOUT_SECONDS", "30"))
MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.0

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class PrintifyError(Exception):
    """Raised when a Printify API call fails after retries."""

    def __init__(self, message: str, status_code: Optional[int] = None, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


def _token() -> str:
    token = os.environ.get("PRINTIFY_API_TOKEN", "").strip()
    if not token:
        raise PrintifyError(
            "PRINTIFY_API_TOKEN is not set — add it to the environment before "
            "calling any Printify endpoint."
        )
    return token


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {_token()}",
        "Content-Type": "application/json",
        "User-Agent": "kiyumi-fulfillment/1.0",
    }


def request(
    method: str,
    path: str,
    *,
    json_body: Optional[Dict[str, Any]] = None,
    query: Optional[Dict[str, Any]] = None,
) -> Any:
    """
    Perform an authenticated request against the Printify API.

    Retries transient failures (429/5xx) with exponential backoff, then raises
    PrintifyError with the API's error message on final failure.
    """
    url = f"{BASE_URL}{path}"
    last_error: Optional[str] = None
    last_status: Optional[int] = None
    last_payload: Any = None

    for attempt in range(1, MAX_RETRIES + 2):
        try:
            response = requests.request(
                method,
                url,
                headers=_headers(),
                json=json_body,
                params=query,
                timeout=REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            last_error = f"network error: {exc}"
            log.warning("Printify %s %s failed (attempt %d): %s", method, path, attempt, exc)
            if attempt <= MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1)))
            continue

        last_status = response.status_code

        if 200 <= response.status_code < 300:
            try:
                return response.json() if response.content else {}
            except ValueError:
                return {}

        try:
            last_payload = response.json()
        except ValueError:
            last_payload = response.text[:500]

        # Extract a human-readable message from common Printify error shapes.
        if isinstance(last_payload, dict):
            last_error = (
                last_payload.get("message")
                or last_payload.get("error")
                or str(last_payload)[:300]
            )
        else:
            last_error = str(last_payload)[:300]

        if response.status_code in RETRYABLE_STATUS_CODES and attempt <= MAX_RETRIES:
            wait = RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1))
            log.warning(
                "Printify %s %s → HTTP %d, retrying in %.1fs (attempt %d)",
                method, path, response.status_code, wait, attempt,
            )
            time.sleep(wait)
            continue

        break

    raise PrintifyError(
        f"Printify {method} {path} failed (HTTP {last_status}): {last_error}",
        status_code=last_status,
        payload=last_payload,
    )


# ---------------------------------------------------------------------------
# Shops
# ---------------------------------------------------------------------------

def list_shops() -> List[Dict[str, Any]]:
    return request("GET", "/shops.json")


def resolve_shop_id(shop_id: Optional[str] = None) -> str:
    """Return the shop id to use: explicit arg → env default → first shop."""
    candidate = (shop_id or DEFAULT_SHOP_ID or "").strip()
    if candidate:
        return candidate
    shops = list_shops()
    if not shops:
        raise PrintifyError("No Printify shops available for this token.")
    return str(shops[0]["id"])


# ---------------------------------------------------------------------------
# Catalog (blueprints / providers / variants)
# ---------------------------------------------------------------------------

def list_blueprints() -> List[Dict[str, Any]]:
    return request("GET", "/catalog/blueprints.json")


def list_print_providers(blueprint_id: int) -> List[Dict[str, Any]]:
    return request("GET", f"/catalog/blueprints/{blueprint_id}/print_providers.json")


def list_variants(blueprint_id: int, print_provider_id: int) -> Dict[str, Any]:
    """
    Returns the provider payload:
      { id, title, variants: [ { id, title, options: {color, size, ...},
                                 placeholders: [ {position, decoration_method,
                                                 width, height} ... ] } ] }
    The `placeholders` entries drive the AOP print-area layout construction.
    """
    return request(
        "GET",
        f"/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json",
    )


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------

def upload_image_by_url(file_name: str, url: str) -> Dict[str, Any]:
    """
    Register a publicly accessible image with Printify and return the payload
    containing `id` (Printify image id), `file_name`, `width`, `height`.
    """
    if not url:
        raise PrintifyError("upload_image_by_url requires a public image url")
    return request(
        "POST",
        "/uploads/images.json",
        json_body={"file_name": file_name, "url": url},
    )


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

def create_product(shop_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """POST /v1/shops/{shop_id}/products.json — returns the created product."""
    return request("POST", f"/shops/{shop_id}/products.json", json_body=payload)


def publish_product(shop_id: str, product_id: str) -> Dict[str, Any]:
    """Make the product visible on the storefront."""
    return request(
        "POST",
        f"/shops/{shop_id}/products/{product_id}/publish.json",
        json_body={"title": True, "description": True, "images": True, "variants": True, "tags": True},
    )


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

def get_shipping_rates(
    shop_id: str,
    line_items: List[Dict[str, Any]],
    address_to: Dict[str, Any],
) -> Dict[str, Any]:
    """
    POST /v1/shops/{shop_id}/orders/shipping.json
    `line_items` = [{product_id, variant_id, quantity}]
    `address_to` = {first_name, last_name, country, region?, city, zip, ...}
    Returns a list of shipping options per print provider.
    """
    return request(
        "POST",
        f"/shops/{shop_id}/orders/shipping.json",
        json_body={"line_items": line_items, "address_to": address_to},
    )


def create_order(shop_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /v1/shops/{shop_id}/orders.json
    Payload: {external_id?, label?, send_shipping_notification, line_items,
              shipping_method, is_printify_express?, is_economy?,
              address_to: {...}}
    Returns {id, total_price, total_shipping, status, ...}.
    """
    return request("POST", f"/shops/{shop_id}/orders.json", json_body=payload)


def send_order_to_production(shop_id: str, order_id: str) -> Dict[str, Any]:
    return request(
        "POST",
        f"/shops/{shop_id}/orders/{order_id}/send_to_production.json",
    )


def get_order(shop_id: str, order_id: str) -> Dict[str, Any]:
    return request("GET", f"/shops/{shop_id}/orders/{order_id}.json")


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------

def list_webhooks(shop_id: str) -> List[Dict[str, Any]]:
    return request("GET", f"/shops/{shop_id}/webhooks.json")


def create_webhook(shop_id: str, topic: str, url: str) -> Dict[str, Any]:
    return request(
        "POST",
        f"/shops/{shop_id}/webhooks.json",
        json_body={"topic": topic, "url": url},
    )


def delete_webhook(shop_id: str, webhook_id: str) -> None:
    request("DELETE", f"/shops/{shop_id}/webhooks/{webhook_id}.json")
