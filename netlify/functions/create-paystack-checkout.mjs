export const config = { path: "/api/checkout/paystack" };

const UNIT_PRICE_KOBO = 800000;
const MAX_DIRECT_QUANTITY = 10;

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function redirect(request, location) {
  return new Response(null, {
    status: 303,
    headers: { location: new URL(location, request.url).toString(), "cache-control": "no-store" }
  });
}

function isBrowserForm(request) {
  const type = (request.headers.get("content-type") || "").toLowerCase();
  return type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
}

function failure(request, status, message, setup = false) {
  if (isBrowserForm(request)) return redirect(request, `/shop/?${setup ? "setup=paystack" : "error=paystack"}`);
  return json(status, { message });
}

async function parseInput(request) {
  const type = (request.headers.get("content-type") || "").toLowerCase();
  if (type.includes("application/json")) return request.json();
  return Object.fromEntries((await request.formData()).entries());
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function safeQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_DIRECT_QUANTITY ? quantity : null;
}

function siteUrl(request) {
  return String(process.env.PUBLIC_SITE_URL || process.env.URL || new URL(request.url).origin).replace(/\/$/, "");
}

export default async function handler(request) {
  if (request.method !== "POST") return json(405, { message: "Method not allowed." }, { allow: "POST" });

  try {
    const input = await parseInput(request);
    if (input.website) return failure(request, 400, "Invalid submission.");

    const email = String(input.email || "").trim();
    const name = String(input.name || "").trim();
    const phone = String(input.phone || "").trim();
    const address = String(input.address || "").trim();
    const quantity = safeQuantity(input.quantity);

    if (!validEmail(email) || name.length < 2 || phone.length < 7 || address.length < 8 || !quantity) {
      return failure(request, 400, "Please complete your name, email, phone, delivery address and quantity.");
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return failure(
        request,
        503,
        "Secure Nigeria checkout is being activated. Please use WhatsApp or contact info@gleaningground.com.",
        true
      );
    }

    const amount = UNIT_PRICE_KOBO * quantity;
    const callbackUrl = `${siteUrl(request)}/shop/success/?provider=paystack`;
    const metadata = {
      book: "the-divine-blueprint",
      edition: "paperback",
      preorder: true,
      quantity,
      customer_name: name,
      phone,
      delivery_address: address,
      companion_journal_included: true,
      custom_fields: [
        { display_name: "Customer name", variable_name: "customer_name", value: name },
        { display_name: "Phone", variable_name: "phone", value: phone },
        { display_name: "Quantity", variable_name: "quantity", value: String(quantity) },
        { display_name: "Delivery address", variable_name: "delivery_address", value: address }
      ]
    };

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ email, amount, currency: "NGN", callback_url: callbackUrl, metadata })
    });
    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status || !result.data?.authorization_url) {
      console.error("Paystack checkout error", result.message || result);
      return failure(request, 502, "Paystack could not open checkout. Please try again or use WhatsApp.");
    }

    return redirect(request, result.data.authorization_url);
  } catch (error) {
    console.error("Paystack checkout exception", error);
    return failure(request, 500, "Checkout could not be started. Please try again.");
  }
}
