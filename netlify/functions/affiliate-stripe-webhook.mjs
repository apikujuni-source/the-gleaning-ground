import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  env,
  json,
  findActiveAmbassador,
  commissionFor,
  holdUntilEpoch,
  updateCheckoutMetadata,
  findSessionByPaymentIntent
} from './_affiliate-core.mjs';
import {
  commissionableAmountForSession,
  commissionBasisSource,
  commissionableAmountAfterRefund
} from '../lib/affiliate-commission.mjs';

function verifyStripeSignature(rawBody, signatureHeader) {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) return false;
  const parts = String(signatureHeader || '').split(',');
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some((sig) => {
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

async function recordCompletedSale(session) {
  if (session?.payment_status !== 'paid') return;
  if (session?.metadata?.affiliate_recorded === 'yes') return;

  const ambassador = await findActiveAmbassador(session?.client_reference_id);
  if (!ambassador) return;

  const commissionBasis = commissionableAmountForSession(session);
  const rate = Number(ambassador.commissionRate || 25);
  const commission = commissionFor(commissionBasis, rate);
  if (!commissionBasis || !commission) return;

  await updateCheckoutMetadata(session.id, {
    affiliate_recorded: 'yes',
    affiliate_ref: ambassador.referralId,
    affiliate_email: ambassador.email,
    commission_rate: rate,
    commission_basis_amount: commissionBasis,
    commission_basis_source: commissionBasisSource(session),
    commission_original: commission,
    commission_amount: commission,
    commission_currency: String(session.currency || '').toUpperCase(),
    commission_status: 'pending',
    commission_hold_until: holdUntilEpoch(session.created),
    commission_debt: 0,
    commission_paid_amount: 0
  });
}

async function adjustRefund(charge) {
  const session = await findSessionByPaymentIntent(charge?.payment_intent);
  if (!session || session?.metadata?.affiliate_recorded !== 'yes') return;

  const originalCommission = Number(session.metadata.commission_original || session.metadata.commission_amount || 0);
  const originalBasis = Number(session.metadata.commission_basis_amount || commissionableAmountForSession(session));
  const rate = Number(session.metadata.commission_rate || 0);
  const refundedAmount = Math.max(0, Number(charge?.amount_refunded || 0));
  if (!originalCommission || !originalBasis) return;

  const remainingBasis = commissionableAmountAfterRefund(session, refundedAmount);
  const refundedBasis = Math.max(0, originalBasis - remainingBasis);
  const adjustedCommission = rate > 0
    ? commissionFor(remainingBasis, rate)
    : Math.round(originalCommission * remainingBasis / originalBasis);
  const offsetAmount = Number(session.metadata.commission_offset_amount || 0);
  const payableAfterOffset = Math.max(0, adjustedCommission - offsetAmount);
  const currentStatus = String(session.metadata.commission_status || 'pending');
  const paidAmount = Number(session.metadata.commission_paid_amount || 0);

  if (currentStatus === 'paid' || paidAmount > 0) {
    const debt = Math.max(0, paidAmount - payableAfterOffset);
    await updateCheckoutMetadata(session.id, {
      commission_amount: payableAfterOffset,
      commission_debt: debt,
      commission_status: debt > 0 ? 'debt' : 'paid',
      commission_refunded_amount: refundedAmount,
      commission_refunded_basis_amount: refundedBasis
    });
    return;
  }

  await updateCheckoutMetadata(session.id, {
    commission_amount: payableAfterOffset,
    commission_status: payableAfterOffset > 0 ? 'pending' : 'reversed',
    commission_refunded_amount: refundedAmount,
    commission_refunded_basis_amount: refundedBasis
  });
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!env('STRIPE_SECRET_KEY') || !env('STRIPE_WEBHOOK_SECRET')) {
    return json(503, { ok: false, error: 'STRIPE_NOT_CONFIGURED' });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!verifyStripeSignature(rawBody, signature)) {
    return json(400, { ok: false, error: 'INVALID_SIGNATURE' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, error: 'INVALID_JSON' });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await recordCompletedSale(event.data?.object);
    } else if (event.type === 'charge.refunded') {
      await adjustRefund(event.data?.object);
    }
    return json(200, { ok: true });
  } catch (error) {
    console.error('Affiliate Stripe webhook failed', error);
    return json(500, { ok: false, error: 'AFFILIATE_WEBHOOK_FAILED' });
  }
};

export const config = {
  path: '/api/affiliate/stripe-webhook'
};
