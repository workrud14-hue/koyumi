/** Orders at/above this subtotal ship free (displayed in Bag, Checkout, announcement bar). */
export const FREE_SHIPPING_THRESHOLD = 150;

/** Flat shipping rate (USD) for orders under the free-shipping threshold. */
export const FLAT_SHIPPING_USD = 8;

export function shippingForSubtotal(subtotalUsd: number): number {
  return subtotalUsd >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_USD;
}
