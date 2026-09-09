import { createHash } from 'node:crypto';
import {
  ADMIN_GITHUB_LOGIN,
  json,
  verifyGithubAdmin,
  findAmbassadorBySlug,
  listCheckoutSessions,
  updateCheckoutMetadata
} from './_affiliate-core.mjs';

const MAX_NOTE = 300;
const MAX_REFERENCE = 160;
const MAX_METHOD = 80;
const MAX_FILENAME = 180;

function cleanText(value, max) {
  return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

function validDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parsed = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '' : text;
}

function receiptFingerprint(value) {
  if (!value || typeof value !== 'object') return null;
  const sha256 = String(value.sha256 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha256)) return null;
  const size = Math.max(0, Math.min(Number(value.size || 0), 1_000_000_000));
  return {
    name: cleanText(value.name, MAX_FILENAME),
    type: cleanText(value.type, 100),
    size: Math.round(size),
    sha256
  };
}

function availableSessions(sessions, referralId, currency = '') {
  return sessions
    .filter((session) => session?.metadata?.affiliate_recorded === 'yes')
    .filter((session) => session?.metadata?.affiliate_ref === referralId)
    .filter((session) => session?.metadata?.commission_status === 'available')
    .filter((session) => Number(session?.metadata?.commission_amount || 0) > 0)
    .filter((session) => !currency || String(session?.metadata?.commission_currency || session?.currency || '').toUpperCase() === currency)
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));
}

function summarize(sessions, referralId) {
  const groups = new Map();
  for (const session of availableSessions(sessions, referralId)) {
    const currency = String(session?.metadata?.commission_currency || session?.currency || '').toUpperCase();
    if (!currency) continue;
    if (!groups.has(currency)) groups.set(currency, { currency, amount: 0, count: 0 });
    const group = groups.get(currency);
    group.amount += Number(session?.metadata?.commission_amount || 0);
    group.count += 1;
  }
  return [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const authorization = String(request.headers.get('authorization') || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!(await verifyGithubAdmin(token))) return json(403, { ok: false, error: 'ADMIN_REQUIRED' });

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'INVALID_JSON' });
  }

  const ambassador = await findAmbassadorBySlug(payload?.slug);
  if (!ambassador) return json(404, { ok: false, error: 'AMBASSADOR_NOT_FOUND' });

  let sessions = [];
  try {
    sessions = await listCheckoutSessions();
  } catch (error) {
    console.error('Manual affiliate payout Stripe query failed', error);
    return json(502, { ok: false, error: 'STRIPE_QUERY_FAILED' });
  }

  const action = String(payload?.action || 'preview').toLowerCase();
  const groups = summarize(sessions, ambassador.referralId);
  if (action === 'preview') {
    return json(200, {
      ok: true,
      ambassadorName: ambassador.ambassadorName,
      referralId: ambassador.referralId,
      groups,
      note: groups.length
        ? 'Only commissions that have completed the hold period and automatic refund/debt checks are shown.'
        : 'No commissions are currently available for payout.'
    });
  }

  if (action !== 'record') return json(400, { ok: false, error: 'INVALID_ACTION' });

  const currency = String(payload?.currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return json(400, { ok: false, error: 'INVALID_CURRENCY' });

  const method = cleanText(payload?.method, MAX_METHOD);
  const reference = cleanText(payload?.reference, MAX_REFERENCE);
  const payoutDate = validDate(payload?.payoutDate);
  const note = cleanText(payload?.note, MAX_NOTE);
  const receipt = receiptFingerprint(payload?.receipt);

  if (!method || !reference || !payoutDate) {
    return json(400, { ok: false, error: 'PAYOUT_DETAILS_REQUIRED' });
  }

  const payable = availableSessions(sessions, ambassador.referralId, currency);
  if (!payable.length) {
    return json(409, { ok: false, error: 'NO_AVAILABLE_COMMISSION' });
  }

  const digest = createHash('sha256')
    .update(`${ambassador.referralId}|${currency}|${reference}`)
    .digest('hex')
    .slice(0, 20)
    .toUpperCase();
  const batchId = `MAN-${digest}`;
  const paidAt = Math.floor(Date.now() / 1000);

  let recordedAmount = 0;
  let recordedCount = 0;
  for (const session of payable) {
    const amount = Number(session?.metadata?.commission_amount || 0);
    const metadata = {
      commission_status: 'paid',
      commission_paid_amount: amount,
      commission_payout_amount: amount,
      commission_payout_mode: 'manual',
      commission_payout_batch: batchId,
      commission_payout_reference: reference,
      commission_payout_method: method,
      commission_payout_date: payoutDate,
      commission_paid_at: paidAt,
      commission_payout_admin: ADMIN_GITHUB_LOGIN,
      commission_payout_note: note
    };

    if (receipt) {
      metadata.commission_receipt_name = receipt.name;
      metadata.commission_receipt_type = receipt.type;
      metadata.commission_receipt_size = receipt.size;
      metadata.commission_receipt_sha256 = receipt.sha256;
    }

    try {
      await updateCheckoutMetadata(session.id, metadata);
      recordedAmount += amount;
      recordedCount += 1;
    } catch (error) {
      console.error(`Could not mark affiliate commission ${session.id} paid`, error);
      return json(500, {
        ok: false,
        error: 'PARTIAL_PAYOUT_RECORD',
        batchId,
        recordedAmount,
        recordedCount
      });
    }
  }

  return json(200, {
    ok: true,
    ambassadorName: ambassador.ambassadorName,
    referralId: ambassador.referralId,
    currency,
    amount: recordedAmount,
    commissionCount: recordedCount,
    payoutDate,
    method,
    reference,
    batchId,
    receiptFingerprintRecorded: Boolean(receipt)
  });
};

export const config = { path: '/api/admin/affiliate-payout' };
