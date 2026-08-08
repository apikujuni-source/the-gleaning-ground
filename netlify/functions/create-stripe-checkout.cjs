const PRICE_CENTS = 1099;
const MAX_DIRECT_QUANTITY = 10;

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  const type = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (type.includes("application/json")) return JSON.parse(event.body || "{}");
  return Object.fromEntries(new URLSearchParams(event.body || ""));
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function safeQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_DIRECT_QUANTITY ? quantity : null;
}

function siteUrl() {
  const configured = process.env.PUBLIC_SITE_URL || process.env.URL || "https://gleaningground.com";
  return configured.replace(/\/$/, "");
}

function regionConfig(region) {
  const internationalCountries = String(process.env.STRIPE_ALLOWED_INTERNATIONAL_COUNTRIES || "")
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);

  const regions = {
    us: {
      label: "United States shipping",
      countries: ["US"],
      shipping: process.env.STRIPE_US_SHIPPING_CENTS
    },
    canada: {
      label: "Canada shipping",
      countries: ["CA"],
      shipping: process.env.STRIPE_CANADA_SHIPPING_CENTS
    },
    "uk-eu": {
      label: "UK and Europe shipping",
      countries: ["GB", "IE", "FR", "DE", "NL", "BE", "ES", "IT", "PT", "AT", "FI", "SE", "DK", "NO", "CH", "PL", "CZ"],
      shipping: process.env.STRIPE_UK_EU_SHIPPING_CENTS
    },
    international: {
      label: "International shipping",
      countries: internationalCountries,
      shipping: process.env.STRIPE_INTERNATIONAL_SHIPPING_CENTS
    }
  };

  const selected = regions[region];
  if (!selected) return null;
  const shippingCents = Number.parseInt(selected.shipping, 10);
  if (!Number.isInteger(shippingCents) || shippingCents < 0 || selected.countries.length === 0) return null;
  return { ...selected, shippingCents };
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Method not allowed." }, { allow: "POST" });
  }

  try {
    const input = parseBody(event);
    if (input.website) return response(400, { message: "Invalid submission." });

    const email = String(input.email || "").trim();
    const quantity = safeQuantity(input.quantity);
    const region = regionConfig(String(input.region || ""));

    if (!validEmail(email) || !quantity || !region) {
      return response(400, { message: "Please provide a valid email, quantity and supported delivery region." });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return response(503, {
        code: "STRIPE_SETUP_REQUIRED",
        message: "Direct international checkout is being activated. Please use Amazon or contact info@gleaningground.com."
      });
    }

    const base = siteUrl();
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("submit_type", "book");
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
    params.set("metadata[region]", String(input.region));

    region.countries.forEach((country, index) => {
      params.set(`shipping_address_collection[allowed_countries][${index}]`, country);
    });
    params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(region.shippingCents));
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    params.set("shipping_options[0][shipping_rate_data][display_name]", region.label);

    if (String(process.env.STRIPE_AUTOMATIC_TAX || "").toLowerCase() === "true") {
      params.set("automatic_tax[enabled]", "true");
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok || !session.url) {
      console.error("Stripe checkout error", session.error?.message || session);
      return response(502, { message: "Stripe could not open checkout. Please try again or use Amazon." });
    }

    return {
      statusCode: 303,
      headers: { location: session.url, "cache-control": "no-store" },
      body: ""
    };
  } catch (error) {
    console.error("Stripe checkout exception", error);
    return response(500, { message: "Checkout could not be started. Please try again." });
  }
};
