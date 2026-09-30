/**
 * Qikink SANDBOX test-order script for KIYUMI
 * ------------------------------------------------------------------
 * Places one dummy order via the Qikink Sandbox Order API so you can
 * share the order number + payload with Qikink support (their go-live
 * requirement is 3 successful sandbox orders).
 *
 * Spec reference: https://documenter.getpostman.com/view/26157218/2sB3QKqpma
 *   1. POST {base}/api/token          (form-urlencoded: ClientId, client_secret)
 *   2. POST {base}/api/order/create   (json, headers: ClientId + Accesstoken)
 *
 * Sandbox gotcha: the sandbox DB is empty, so search_from_my_products MUST be 0
 * and design details (design_code / placement_sku / mockup_link) are mandatory.
 *
 * Usage:
 *   node scripts/qikink-test-order.mjs                 (uses inline defaults)
 *   bun scripts/qikink-test-order.mjs
 */

const CLIENT_ID = process.env.QIKINK_CLIENT_ID ?? "941225710182238";
const CLIENT_SECRET =
  process.env.QIKINK_SANDBOX_SECRET ??
  "c594de23dce0f58b6bb1bcc3a24d87d0e62f680a746a02251d54a9ca17a5ae58";
const BASE_URL = "https://sandbox.qikink.com"; // live is https://api.qikink.com

// KIYUMI store front design used as the sample artwork (public Unsplash URL).
const DESIGN_LINK =
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80";
const MOCKUP_LINK =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80";

const getQikinkToken = async () => {
  const params = new URLSearchParams();
  params.append("ClientId", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);

  const res = await fetch(`${BASE_URL}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Token endpoint returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const token = data.Accesstoken;
  if (!token) {
    throw new Error(
      `No Accesstoken in response (HTTP ${res.status}): ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return token;
};

const createOrder = async (token) => {
  // order_number: alphanumeric only, MAX 15 chars.
  const orderNumber = `KYTEST${Date.now()}`.slice(0, 15);

  const payload = {
    order_number: orderNumber,
    qikink_shipping: "1",
    gateway: "Prepaid",
    total_order_value: "78",
    line_items: [
      {
        // Sandbox DB has no "My Products" — must provide design details manually.
        search_from_my_products: 0,
        sku: "MVnHs-Wh-S", // Men's V-Neck Half Sleeve, White, S (standard Qikink SKU)
        quantity: "1",
        price: "78",
        print_type_id: 1, // 1 = DTG
        designs: [
          {
            design_code: "KIYUMI-SANDBOX-01",
            width_inches: "10",
            height_inches: "10",
            placement_sku: "fr", // fr = front print
            design_link: DESIGN_LINK,
            mockup_link: MOCKUP_LINK,
          },
        ],
      },
    ],
    shipping_address: {
      first_name: "Kiyumi",
      last_name: "Test",
      address1: "42 Sandbox Lane",
      address2: "",
      phone: "9999999999",
      email: "test@kiyumi.online",
      city: "Mumbai",
      zip: "400001",
      province: "Maharashtra",
      country_code: "IN",
    },
  };

  const res = await fetch(`${BASE_URL}/api/order/create`, {
    method: "POST",
    headers: {
      ClientId: CLIENT_ID,
      Accesstoken: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Order endpoint returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  return { status: res.status, data, payload };
};

(async () => {
  console.log("→ [1/2] Requesting sandbox access token from", `${BASE_URL}/api/token ...`);
  const token = await getQikinkToken();
  console.log("✅ Access token acquired:", `${token.slice(0, 12)}...`);

  console.log("→ [2/2] Creating sandbox order via", `${BASE_URL}/api/order/create ...`);
  const { status, data, payload } = await createOrder(token);

  console.log("\n──────────────────────────────────────────────");
  console.log("EXACT JSON PAYLOAD SENT TO QIKINK (share this)");
  console.log("──────────────────────────────────────────────");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\n──────────────────────────────────────────────");
  console.log(`RESPONSE (HTTP ${status})`);
  console.log("──────────────────────────────────────────────");
  console.log(JSON.stringify(data, null, 2));

  if (data?.order_id) {
    console.log("\n✅ SANDBOX ORDER PLACED — order number:", data.order_id);
  } else {
    console.error("\n❌ Order failed — response above is the raw API error.");
    process.exitCode = 1;
  }
})();
