function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "GET") return response(405, { message: "Method not allowed." });

  const sessionId = String(event.queryStringParameters?.session_id || "").trim();
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return response(400, { message: "A valid checkout session is required." });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return response(503, { message: "Payment verification is not configured." });

  try {
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${secret}` }
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe verification error", session.error?.message || session);
      return response(502, { message: "Stripe payment verification failed." });
    }

    const paid = session.payment_status === "paid" && session.status === "complete";
    return response(paid ? 200 : 202, {
      paid,
      provider: "stripe",
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || session.customer_email || null,
      quantity: Number.parseInt(session.metadata?.quantity || "1", 10),
      amount_total: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    console.error("Stripe verification exception", error);
    return response(500, { message: "Payment verification could not be completed." });
  }
};
