const UNIT_PRICE_CENTS = 1099;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async function handler(request) {
  if (request.method !== "GET") return json(405, { message: "Method not allowed." });

  const sessionId = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return json(400, { message: "A valid checkout session is required." });
  }

  const secret = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!secret) return json(503, { message: "Payment verification is not configured." });

  try {
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${secret}` }
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe verification error", session.error?.message || session);
      return json(502, { message: "Stripe payment verification failed." });
    }

    const quantity = Number.parseInt(session.metadata?.quantity || "1", 10);
    const expectedSubtotal = UNIT_PRICE_CENTS * quantity;
    const paid =
      session.payment_status === "paid" &&
      session.status === "complete" &&
      session.currency === "usd" &&
      session.amount_subtotal === expectedSubtotal;

    return json(paid ? 200 : 202, {
      paid,
      provider: "stripe",
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || session.customer_email || null,
      quantity,
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    console.error("Stripe verification exception", error);
    return json(500, { message: "Payment verification could not be completed." });
  }
}
