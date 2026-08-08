const UNIT_PRICE_KOBO = 800000;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async function handler(request) {
  if (request.method !== "GET") return json(405, { message: "Method not allowed." });

  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref") || "";
  if (!/^[A-Za-z0-9._-]{6,120}$/.test(reference)) {
    return json(400, { message: "A valid payment reference is required." });
  }

  const secret = Netlify.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return json(503, { message: "Payment verification is not configured." });

  try {
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { authorization: `Bearer ${secret}` }
    });
    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status) {
      console.error("Paystack verification error", result.message || result);
      return json(502, { message: "Paystack payment verification failed." });
    }

    const transaction = result.data || {};
    const quantity = Number.parseInt(transaction.metadata?.quantity || "1", 10);
    const expectedAmount = UNIT_PRICE_KOBO * quantity;
    const paid =
      transaction.status === "success" &&
      transaction.currency === "NGN" &&
      transaction.amount === expectedAmount;

    return json(paid ? 200 : 202, {
      paid,
      provider: "paystack",
      payment_status: transaction.status,
      customer_email: transaction.customer?.email || null,
      quantity,
      amount: transaction.amount,
      currency: transaction.currency,
      reference: transaction.reference
    });
  } catch (error) {
    console.error("Paystack verification exception", error);
    return json(500, { message: "Payment verification could not be completed." });
  }
}
