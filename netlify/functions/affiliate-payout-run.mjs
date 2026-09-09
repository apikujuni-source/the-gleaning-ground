import { createHash } from 'node:crypto';
import {
  env,
  listCheckoutSessions,
  updateCheckoutMetadata,
  findPaystackRecipient,
  paystackRequest,
  findActiveAmbassador,
  commissionFor,
  holdUntilEpoch
} from './_affiliate-core.mjs';

function transferReference(referralId, sessionIds) {
  const digest = createHash('sha256').update(`${referralId}|${sessionIds.sort().join('|')}`).digest('hex').slice(0, 24);
  const ref = String(referralId || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12);
  return `tdb_${ref}_${digest}`.slice(0, 50);
}

async function reconcileMissingCommission(session) {
  if (session?.payment_status !== 'paid') return session;
  if (session?.metadata?.affiliate_recorded === 'yes') return session;
  const ambassador = await findActiveAmbassador(session?.client_reference_id);
  if (!ambassador) return session;
  const amountTotal = Number(session?.amount_total || 0);
  const rate = Number(ambassador.commissionRate || 25);
  const commission = commissionFor(amountTotal, rate);
  if (!amountTotal || !commission) return session;
  const metadata = {
    affiliate_recorded: 'yes',
    affiliate_ref: ambassador.referralId,
    affiliate_email: ambassador.email,
    commission_rate: rate,
    commission_original: commission,
    commission_amount: commission,
    commission_currency: String(session.currency || '').toUpperCase(),
    commission_status: 'pending',
    commission_hold_until: holdUntilEpoch(session.created),
    commission_debt: 0,
    commission_paid_amount: 0,
    commission_reconciled: 'yes'
  };
  await updateCheckoutMetadata(session.id, metadata);
  return { ...session, metadata: { ...(session.metadata || {}), ...Object.fromEntries(Object.entries(metadata).map(([k,v]) => [k, String(v)])) } };
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

async function applyOffsets(allocations, debtSessions, offsetTotal) {
  if (offsetTotal <= 0) return;
  await reduceDebt(debtSessions, offsetTotal);
  for (const allocation of allocations) {
    if (allocation.offset <= 0) continue;
    const previousOffset = Number(allocation.session.metadata?.commission_offset_amount || 0);
    if (allocation.payout <= 0) {
      await updateCheckoutMetadata(allocation.session.id, {
        commission_status: 'offset',
        commission_amount: 0,
        commission_offset_amount: previousOffset + allocation.offset,
        commission_payout_amount: 0,
        commission_paid_amount: 0
      });
    } else {
      await updateCheckoutMetadata(allocation.session.id, {
        commission_status: 'pending',
        commission_amount: allocation.payout,
        commission_offset_amount: previousOffset + allocation.offset
      });
    }
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

  let offsetRemaining = offsetTotal;
  const allocations = pending.map((session) => {
    const commission = Number(session.metadata.commission_amount || 0);
    const offset = Math.min(commission, offsetRemaining);
    offsetRemaining -= offset;
    return { session, commission, offset, payout: commission - offset };
  });

  await applyOffsets(allocations, debtSessions, offsetTotal);

  const payable = allocations.filter((a) => a.payout > 0);
  const payoutTotal = payable.reduce((sum, a) => sum + a.payout, 0);
  if (payoutTotal <= 0) return { referralId, action: 'offset', amount: offsetTotal };

  const recipient = await findPaystackRecipient(referralId);
  if (!recipient?.recipient_code) {
    return { referralId, action: 'awaiting_payout_setup', amount: payoutTotal };
  }

  const reference = transferReference(referralId, payable.map((a) => a.session.id));
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

  for (const allocation of payable) {
    await updateCheckoutMetadata(allocation.session.id, {
      commission_status: transferStatus === 'success' ? 'paid' : 'payout_pending',
      commission_amount: allocation.payout,
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
  if (!env('STRIPE_SECRET_KEY')) {
    console.log('Affiliate reconciliation/payout run skipped: Stripe is not configured.');
    return;
  }

  const rawSessions = await listCheckoutSessions();
  const sessions = [];
  for (const session of rawSessions) {
    try { sessions.push(await reconcileMissingCommission(session)); }
    catch (error) {
      console.error(`Affiliate reconciliation failed for ${session?.id || 'unknown session'}`, error);
      sessions.push(session);
    }
  }

  if (!env('PAYSTACK_SECRET_KEY')) {
    console.log('Affiliate reconciliation complete; automatic Nigeria payout skipped because Paystack is not configured.');
    return;
  }

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
  console.log('Affiliate reconciliation/payout run complete', JSON.stringify(results));
};

export const config = { schedule: '15 8 * * *' };
