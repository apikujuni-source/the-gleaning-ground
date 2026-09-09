import { createHash } from 'node:crypto';
import {
  env,
  listCheckoutSessions,
  updateCheckoutMetadata,
  findPaystackRecipient,
  paystackRequest
} from './_affiliate-core.mjs';

function transferReference(referralId, sessionIds) {
  const digest = createHash('sha256').update(`${referralId}|${sessionIds.sort().join('|')}`).digest('hex').slice(0, 24);
  const ref = String(referralId || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12);
  return `tdb_${ref}_${digest}`.slice(0, 50);
}

async function reduceDebt(debtSessions, amountToOffset) {
  let remaining = amountToOffset;
  for (const session of debtSessions) {
    if (remaining <= 0) break;
    const currentDebt = Number(session.metadata?.commission_debt || 0);
    if (currentDebt <= 0) continue;
    const applied = Math.min(currentDebt, remaining);
    const newDebt = currentDebt - applied;
    remaining -= applied;
    await updateCheckoutMetadata(session.id, {
      commission_debt: newDebt,
      commission_status: newDebt > 0 ? 'debt' : 'paid',
      commission_debt_offset_total: Number(session.metadata?.commission_debt_offset_total || 0) + applied
    });
  }
}

async function processAmbassador(referralId, sessions) {
  const now = Math.floor(Date.now() / 1000);
  const pending = sessions
    .filter((s) => s.metadata?.commission_status === 'pending')
    .filter((s) => Number(s.metadata?.commission_hold_until || 0) <= now)
    .filter((s) => Number(s.metadata?.commission_amount || 0) > 0)
    .sort((a,b) => Number(a.created || 0) - Number(b.created || 0));

  const debtSessions = sessions
    .filter((s) => s.metadata?.commission_status === 'debt')
    .filter((s) => Number(s.metadata?.commission_debt || 0) > 0)
    .sort((a,b) => Number(a.created || 0) - Number(b.created || 0));

  if (!pending.length) return { referralId, action: 'none' };

  const totalPending = pending.reduce((sum, s) => sum + Number(s.metadata.commission_amount || 0), 0);
  const totalDebt = debtSessions.reduce((sum, s) => sum + Number(s.metadata.commission_debt || 0), 0);
  const offsetTotal = Math.min(totalPending, totalDebt);
  const payoutTotal = Math.max(0, totalPending - totalDebt);

  let offsetRemaining = offsetTotal;
  const allocations = pending.map((session) => {
    const commission = Number(session.metadata.commission_amount || 0);
    const offset = Math.min(commission, offsetRemaining);
    offsetRemaining -= offset;
    return { session, commission, offset, payout: commission - offset };
  });

  if (offsetTotal > 0) await reduceDebt(debtSessions, offsetTotal);

  if (payoutTotal <= 0) {
    for (const allocation of allocations) {
      await updateCheckoutMetadata(allocation.session.id, {
        commission_status: 'offset',
        commission_offset_amount: allocation.offset,
        commission_payout_amount: 0,
        commission_paid_amount: 0
      });
    }
    return { referralId, action: 'offset', amount: offsetTotal };
  }

  const recipient = await findPaystackRecipient(referralId);
  if (!recipient?.recipient_code) {
    return { referralId, action: 'awaiting_payout_setup', amount: payoutTotal };
  }

  const payoutSessions = allocations.filter((a) => a.payout > 0);
  const reference = transferReference(referralId, payoutSessions.map((a) => a.session.id));

  let transfer;
  try {
    const verified = await paystackRequest(`/transfer/verify/${encodeURIComponent(reference)}`);
    if (verified?.data?.reference === reference) transfer = verified;
  } catch {}

  if (!transfer) {
    transfer = await paystackRequest('/transfer', {
      method: 'POST',
      body: {
        source: 'balance',
        amount: payoutTotal,
        recipient: recipient.recipient_code,
        reference,
        reason: 'The Divine Blueprint Ambassador commission',
        currency: 'NGN'
      }
    });
  }

  const transferStatus = String(transfer?.data?.status || '').toLowerCase();
  if (transferStatus === 'otp') {
    console.error(`Paystack transfer OTP is enabled; automatic payout ${reference} needs manual finalization.`);
    return { referralId, action: 'otp_required', reference, amount: payoutTotal };
  }

  for (const allocation of allocations) {
    if (allocation.payout <= 0) {
      await updateCheckoutMetadata(allocation.session.id, {
        commission_status: 'offset',
        commission_offset_amount: allocation.offset,
        commission_payout_amount: 0,
        commission_paid_amount: 0
      });
      continue;
    }

    await updateCheckoutMetadata(allocation.session.id, {
      commission_status: transferStatus === 'success' ? 'paid' : 'payout_pending',
      commission_offset_amount: allocation.offset,
      commission_payout_amount: allocation.payout,
      commission_paid_amount: transferStatus === 'success' ? allocation.payout : 0,
      commission_payout_reference: reference
    });
  }

  return {
    referralId,
    action: transferStatus === 'success' ? 'paid' : 'payout_pending',
    reference,
    amount: payoutTotal
  };
}

export default async () => {
  if (!env('STRIPE_SECRET_KEY') || !env('PAYSTACK_SECRET_KEY')) {
    console.log('Affiliate payout run skipped: Stripe and/or Paystack is not configured.');
    return;
  }

  const sessions = await listCheckoutSessions();
  const groups = new Map();
  for (const session of sessions) {
    const metadata = session.metadata || {};
    const referralId = String(metadata.affiliate_ref || '');
    const currency = String(metadata.commission_currency || session.currency || '').toUpperCase();
    if (!referralId || metadata.affiliate_recorded !== 'yes' || currency !== 'NGN') continue;
    if (!groups.has(referralId)) groups.set(referralId, []);
    groups.get(referralId).push(session);
  }

  const results = [];
  for (const [referralId, group] of groups) {
    try {
      results.push(await processAmbassador(referralId, group));
    } catch (error) {
      console.error(`Affiliate payout failed for ${referralId}`, error);
      results.push({ referralId, action: 'error' });
    }
  }
  console.log('Affiliate payout run complete', JSON.stringify(results));
};

export const config = {
  schedule: '15 8 * * *'
};
