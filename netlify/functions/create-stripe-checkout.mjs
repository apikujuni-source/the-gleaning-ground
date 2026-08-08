const PRICE_CENTS = 1099;
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
    headers: {
      location: new URL(location, request.url).toString(),
      "cache-control": "no-store"
    }
  });
}

function isBrowserForm(request) {
  const type = (request.headers.get("content-type") || "").toLowerCase();
  return type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
}

function failure(request, status, message, setup = false) {
  if (isBrowserForm(request)) return redirect(request, `/shop/?${setup ? "setup=stripe" : "error=stripe"}`);
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
  return String(Netlify.env.get("PUBLIC_SITE_URL") || new URL(request.url).origin).replace(/\/$/, "");
}

function regionConfig(region) {
  const internationalCountries = String(Netlify.env.get("STRIPE_ALLOWED_INTERNATIONAL_COUNTRIES") || "")
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);

  const regions = {
    us: { label: "United States shipping", countries: ["US"], shipping: Netlify.env.get("STRIPE_US_SHIPPING_CENTS") },
    canada: { label: "Canada shipping", countries: ["CA"], shipping: Netlify.env.get("STRIPE_CANADA_SHIPPING_CENTS") },
    "uk-eu": {
      label: "UK and Europe shipping",
      countries: ["GB", "IE", "FR", "DE", "NL", "BE", "ES", "IT", "PT", "AT", "FI", "SE", "DK", "NO", "CH", "PL", "CZ"],
      shipping: Netlify.env.get("STRIPE_UK_EU_SHIPPING_CENTS")
    },
    international: {
      label: "International shipping",
      countries: internationalCountries,
      shipping: Netlify.env.get("STRIPE_INTERNATIONAL_SHIPPING_CENTS")
    }
  };

  const selected = regions[region];
  if (!selected) return null;
  const shippingCents = Number.parseInt(selected.shipping, 10);
  if (!Number.isInteger(shippingCents) || shippingCents < 0 || selected.countries.length === 0) return null;
  return { ...selected, shippingCents };
}

export default async function handler(request) {
  if (request.method !== "POST") return json(405, { message: "Method not allowed." }, { allow: "POST" });

  try {
    const input = await parseInput(request);
    if (input.website) return failure(request, 400, "Invalid submission.");

    const email = String(input.email || "").trim();
    const quantity = safeQuantity(input.quantity);
    const regionKey = String(input.region || "");
    const region = regionConfig(regionKey);

    if (!validEmail(email) || !quantity || !region) {
      return failure(request, 400, "Please provide a valid email, quantity and configured delivery region.");
    }

    const secret = Netlify.env.get("STRIPE_SECRET_KEY");
    if (!secret) {
      return failure(
        request,
        503,
        "Direct international checkout is being activated. Please use Amazon or contact info@gleaningground.com.",
        true
      );
    }

    const base = siteUrl(request);
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("submit_type", "pay");
    params.set("customer_email", email);
    params.set("success_url", `${base}/shop/success/?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${base}/shop/?checkout=cancelled`);
    params.set("phone_number_collection[enabled]", "true");
    params.set("billing_address_collection", "auto");
    params.set("line_items[0][quantity]", String(quantity));
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(PRICE_CENTS));
    params.set("line_items[0][price_data][product_data][name]", "The Divine Blueprint — Paperback Preorder");
    params.set("line_items[0][price_data][product_data][description]", "Includes access to the digital Companion Journal.");
    params.set("metadata[book]", "the-divine-blueprint");
    params.set("metadata[edition]", "paperback");
    params.set("metadata[preorder]", "true");
    params.set("metadata[region]", regionKey);
    params.set("metadata[quantity]", String(quantity));

    region.countries.forEach((country, index) => {
      params.set(`shipping_address_collection[allowed_countries][${index}]`, country);
    });
    params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(region.shippingCents));
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    params.set("shipping_options[0][shipping_rate_data][display_name]", region.label);

    if (String(Netlify.env.get("STRIPE_AUTOMATIC_TAX") || "").toLowerCase() === "true") {
      params.set("automatic_tax[enabled]", "true");
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok || !session.url) {
      console.error("Stripe checkout error", session.error?.message || session);
      return failure(request, 502, "Stripe could not open checkout. Please try again or use Amazon.");
    }

    return redirect(request, session.url);
  } catch (error) {
    console.error("Stripe checkout exception", error);
    return failure(request, 500, "Checkout could not be started. Please try again.");
  }
}
