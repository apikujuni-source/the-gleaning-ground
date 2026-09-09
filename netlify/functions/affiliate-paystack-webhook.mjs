import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  env,
  json,
  listCheckoutSessions,
  updateCheckoutMetadata
} from './_affiliate-core.mjs';

function validSignature(rawBody, supplied) {
  const secret = env('PAYSTACK_SECRET_KEY');
  if (!secret || !supplied) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  try {
    const a = Buffer.from(String(supplied), 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get('x-paystack-signature'))) {
    return json(401, { ok: false, error: 'INVALID_SIGNATURE' });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return json(400, { ok: false, error: 'INVALID_JSON' }); }
  const type = String(event?.event || '');
  if (!['transfer.success','transfer.failed','transfer.reversed'].includes(type)) return json(200, { ok: true });

  const reference = String(event?.data?.reference || '').trim();
  if (!reference) return json(200, { ok: true });

  try {
    const sessions = (await listCheckoutSessions()).filter((session) => session?.metadata?.commission_payout_reference === reference);
    for (const session of sessions) {
      const payoutAmount = Number(session.metadata?.commission_payout_amount || 0);
      if (type === 'transfer.success') {
        await updateCheckoutMetadata(session.id, {
          commission_status: 'paid',
          commission_paid_amount: payoutAmount,
          commission_payout_provider_status: 'success'
        });
      } else {
        await updateCheckoutMetadata(session.id, {
          commission_status: 'pending',
          commission_paid_amount: 0,
          commission_payout_provider_status: type === 'transfer.reversed' ? 'reversed' : 'failed',
          commission_payout_reference: ''
        });
      }
    }
    return json(200, { ok: true });
  } catch (error) {
    console.error('Paystack affiliate webhook processing failed', error);
    return json(500, { ok: false, error: 'PAYSTACK_WEBHOOK_FAILED' });
  }
};

export const config = { path: '/api/affiliate/paystack-webhook' };
