const UNIT_PRICE_KOBO = 800000;
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

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Method not allowed." }, { allow: "POST" });
  }

  try {
    const input = parseBody(event);
    if (input.website) return response(400, { message: "Invalid submission." });

    const email = String(input.email || "").trim();
    const name = String(input.name || "").trim();
    const phone = String(input.phone || "").trim();
    const address = String(input.address || "").trim();
    const quantity = safeQuantity(input.quantity);

    if (!validEmail(email) || name.length < 2 || phone.length < 7 || address.length < 8 || !quantity) {
      return response(400, { message: "Please complete your name, email, phone, delivery address and quantity." });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return response(503, {
        code: "PAYSTACK_SETUP_REQUIRED",
        message: "Secure Nigeria checkout is being activated. Please use WhatsApp or contact info@gleaningground.com."
      });
    }

    const amount = UNIT_PRICE_KOBO * quantity;
    const callbackUrl = `${siteUrl()}/shop/success/?provider=paystack`;
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
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount,
        currency: "NGN",
        callback_url: callbackUrl,
        metadata
      })
    });
    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status || !result.data?.authorization_url) {
      console.error("Paystack checkout error", result.message || result);
      return response(502, { message: "Paystack could not open checkout. Please try again or use WhatsApp." });
    }

    return {
      statusCode: 303,
      headers: { location: result.data.authorization_url, "cache-control": "no-store" },
      body: ""
    };
  } catch (error) {
    console.error("Paystack checkout exception", error);
    return response(500, { message: "Checkout could not be started. Please try again." });
  }
};
