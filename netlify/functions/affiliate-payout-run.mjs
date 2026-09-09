import {
  env,
  listCheckoutSessions,
  updateCheckoutMetadata,
  findActiveAmbassador,
  commissionFor,
  holdUntilEpoch
} from './_affiliate-core.mjs';
import {
  commissionableAmountForSession,
  commissionBasisSource
} from '../lib/affiliate-commission.mjs';

async function reconcileMissingCommission(session) {
  if (session?.payment_status !== 'paid') return session;
  if (session?.metadata?.affiliate_recorded === 'yes') return session;
  const ambassador = await findActiveAmbassador(session?.client_reference_id);
  if (!ambassador) return session;
  const commissionBasis = commissionableAmountForSession(session);
  const rate = Number(ambassador.commissionRate || 25);
  const commission = commissionFor(commissionBasis, rate);
  if (!commissionBasis || !commission) return session;
  const metadata = {
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
    commission_paid_amount: 0,
    commission_reconciled: 'yes'
  };
  await updateCheckoutMetadata(session.id, metadata);
  return {
    ...session,
    metadata: {
      ...(session.metadata || {}),
      ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)]))
    }
  };
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
    if (allocation.payable <= 0) {
      await updateCheckoutMetadata(allocation.session.id, {
        commission_status: 'offset',
        commission_amount: 0,
        commission_offset_amount: previousOffset + allocation.offset,
        commission_payout_amount: 0,
        commission_paid_amount: 0
      });
    } else {
      await updateCheckoutMetadata(allocation.session.id, {
        commission_status: 'available',
        commission_amount: allocation.payable,
        commission_offset_amount: previousOffset + allocation.offset,
        commission_payout_amount: allocation.payable
      });
    }
  }
}

async function processAmbassadorCurrency(referralId, currency, sessions) {
  const now = Math.floor(Date.now() / 1000);
  const pending = sessions
    .filter((session) => session.metadata?.commission_status === 'pending')
    .filter((session) => Number(session.metadata?.commission_hold_until || 0) <= now)
    .filter((session) => Number(session.metadata?.commission_amount || 0) > 0)
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));

  const debtSessions = sessions
    .filter((session) => session.metadata?.commission_status === 'debt')
    .filter((session) => Number(session.metadata?.commission_debt || 0) > 0)
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));

  if (!pending.length) return { referralId, currency, action: 'none' };

  const totalPending = pending.reduce(
    (sum, session) => sum + Number(session.metadata?.commission_amount || 0),
    0
  );
  const totalDebt = debtSessions.reduce(
    (sum, session) => sum + Number(session.metadata?.commission_debt || 0),
    0
  );
  const offsetTotal = Math.min(totalPending, totalDebt);

  let offsetRemaining = offsetTotal;
  const allocations = pending.map((session) => {
    const commission = Number(session.metadata?.commission_amount || 0);
    const offset = Math.min(commission, offsetRemaining);
    offsetRemaining -= offset;
    return { session, commission, offset, payable: commission - offset };
  });

  await applyOffsets(allocations, debtSessions, offsetTotal);

  const directlyAvailable = allocations.filter((allocation) => allocation.offset <= 0 && allocation.payable > 0);
  for (const allocation of directlyAvailable) {
    await updateCheckoutMetadata(allocation.session.id, {
      commission_status: 'available',
      commission_payout_amount: allocation.payable
    });
  }

  const availableTotal = allocations.reduce((sum, allocation) => sum + allocation.payable, 0);
  if (availableTotal <= 0) {
    return { referralId, currency, action: 'offset', amount: offsetTotal };
  }

  return {
    referralId,
    currency,
    action: 'available_for_manual_payout',
    amount: availableTotal,
    offset: offsetTotal,
    commissionCount: allocations.filter((allocation) => allocation.payable > 0).length
  };
}

export default async () => {
  if (!env('STRIPE_SECRET_KEY')) {
    console.log('Affiliate reconciliation run skipped: Stripe is not configured.');
    return;
  }

  const rawSessions = await listCheckoutSessions();
  const sessions = [];
  for (const session of rawSessions) {
    try {
      sessions.push(await reconcileMissingCommission(session));
    } catch (error) {
      console.error(`Affiliate reconciliation failed for ${session?.id || 'unknown session'}`, error);
      sessions.push(session);
    }
  }

  const groups = new Map();
  for (const session of sessions) {
    const metadata = session.metadata || {};
    const referralId = String(metadata.affiliate_ref || '');
    const currency = String(metadata.commission_currency || session.currency || '').toUpperCase();
    if (!referralId || metadata.affiliate_recorded !== 'yes' || !currency) continue;
    const key = `${referralId}|${currency}`;
    if (!groups.has(key)) groups.set(key, { referralId, currency, sessions: [] });
    groups.get(key).sessions.push(session);
  }

  const results = [];
  for (const group of groups.values()) {
    try {
      results.push(await processAmbassadorCurrency(group.referralId, group.currency, group.sessions));
    } catch (error) {
      console.error(`Affiliate availability processing failed for ${group.referralId} ${group.currency}`, error);
      results.push({ referralId: group.referralId, currency: group.currency, action: 'error' });
    }
  }

  console.log('Affiliate reconciliation/manual-payout availability run complete', JSON.stringify(results));
};

export const config = { schedule: '15 8 * * *' };
