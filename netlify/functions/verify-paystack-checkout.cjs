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

  const reference = String(event.queryStringParameters?.reference || event.queryStringParameters?.trxref || "").trim();
  if (!/^[A-Za-z0-9._-]{6,120}$/.test(reference)) {
    return response(400, { message: "A valid payment reference is required." });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return response(503, { message: "Payment verification is not configured." });

  try {
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { authorization: `Bearer ${secret}` }
    });
    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status) {
      console.error("Paystack verification error", result.message || result);
      return response(502, { message: "Paystack payment verification failed." });
    }

    const transaction = result.data || {};
    const paid = transaction.status === "success" && transaction.currency === "NGN";
    return response(paid ? 200 : 202, {
      paid,
      provider: "paystack",
      payment_status: transaction.status,
      customer_email: transaction.customer?.email || null,
      quantity: Number.parseInt(transaction.metadata?.quantity || "1", 10),
      amount: transaction.amount,
      currency: transaction.currency,
      reference: transaction.reference
    });
  } catch (error) {
    console.error("Paystack verification exception", error);
    return response(500, { message: "Payment verification could not be completed." });
  }
};
