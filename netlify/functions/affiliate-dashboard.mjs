import {
  env,
  verifyAffiliateToken,
  findActiveAmbassador,
  listCheckoutSessions,
  findPaystackRecipient
} from './_affiliate-core.mjs';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (amount, currency) => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: String(currency || 'USD').toUpperCase() }).format(Number(amount || 0) / 100);
  } catch {
    return `${String(currency || '').toUpperCase()} ${(Number(amount || 0) / 100).toFixed(2)}`;
  }
};

function render(title, body, status = 200) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#f6f3ec;color:#172536;margin:0}.wrap{max-width:980px;margin:40px auto;padding:24px}h1{color:#173b62}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 28px rgba(17,35,57,.07)}.big{font-size:1.65rem;font-weight:850;color:#173b62}.muted{color:#687586;font-size:.9rem}.status{display:inline-block;padding:4px 8px;border-radius:999px;background:#eef2f6;font-size:.78rem;font-weight:700}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid #edf0f3;font-size:.9rem}a{color:#173b62}.warn{background:#fff4df;padding:12px;border-radius:10px;margin:12px 0}</style></head><body><div class="wrap">${body}</div></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }});
}

export default async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const access = verifyAffiliateToken(token);
  if (!access) return render('Invalid link', '<div class="card"><h1>Link unavailable</h1><p>This earnings link is invalid or expired. Request a new link from The Gleaning Ground.</p></div>', 403);

  const ambassador = await findActiveAmbassador(access.ref);
  if (!ambassador || ambassador.email !== access.email) {
    return render('Account unavailable', '<div class="card"><h1>Account unavailable</h1><p>This ambassador account is not active.</p></div>', 403);
  }

  if (!env('STRIPE_SECRET_KEY')) {
    return render('Ambassador earnings', `<h1>Ambassador Earnings</h1><div class="card"><p>Hello ${esc(ambassador.ambassadorName || '')}.</p><div class="warn">Sales tracking is being connected to the payment processor. Your referral link remains active, but live earnings data is not available yet.</div></div>`, 503);
  }

  let sessions = [];
  try {
    sessions = (await listCheckoutSessions()).filter((session) => session?.metadata?.affiliate_ref === ambassador.referralId);
  } catch (error) {
    console.error('Affiliate dashboard Stripe query failed', error);
    return render('Ambassador earnings', '<div class="card"><h1>Could not load earnings</h1><p>Please try again later.</p></div>', 502);
  }

  const now = Math.floor(Date.now() / 1000);
  const rows = [];
  const totals = {};
  const add = (currency, key, amount) => {
    totals[currency] ||= { pending:0, available:0, paid:0, reversed:0, debt:0, sales:0 };
    totals[currency][key] += Number(amount || 0);
  };

  for (const session of sessions) {
    const m = session.metadata || {};
    const currency = String(m.commission_currency || session.currency || 'USD').toUpperCase();
    const commission = Number(m.commission_amount || 0);
    const status = String(m.commission_status || 'pending');
    const holdUntil = Number(m.commission_hold_until || 0);
    const debt = Number(m.commission_debt || 0);
    add(currency, 'sales', Number(session.amount_total || 0));
    if (status === 'paid') add(currency, 'paid', Number(m.commission_paid_amount || commission));
    else if (status === 'reversed') add(currency, 'reversed', Number(m.commission_original || commission));
    else if (status === 'debt') {
      add(currency, 'paid', Number(m.commission_paid_amount || 0));
      add(currency, 'debt', debt);
    } else if (holdUntil && holdUntil <= now) add(currency, 'available', commission);
    else add(currency, 'pending', commission);

    rows.push({
      created: Number(session.created || 0),
      sale: Number(session.amount_total || 0),
      currency,
      commission,
      status: status === 'pending' && holdUntil <= now ? 'available' : status,
      holdUntil
    });
  }

  rows.sort((a,b) => b.created - a.created);
  let payoutConnected = false;
  if (env('PAYSTACK_SECRET_KEY')) {
    try { payoutConnected = Boolean(await findPaystackRecipient(ambassador.referralId)); } catch {}
  }

  const summary = Object.entries(totals).map(([currency, t]) => `
    <div class="card"><div class="muted">Total referred sales (${currency})</div><div class="big">${money(t.sales,currency)}</div></div>
    <div class="card"><div class="muted">Pending</div><div class="big">${money(t.pending,currency)}</div></div>
    <div class="card"><div class="muted">Available</div><div class="big">${money(t.available,currency)}</div></div>
    <div class="card"><div class="muted">Paid</div><div class="big">${money(t.paid,currency)}</div></div>
    ${t.debt ? `<div class="card"><div class="muted">Refund offset</div><div class="big">${money(t.debt,currency)}</div></div>` : ''}
  `).join('') || '<div class="card"><p>No attributed sales have been recorded yet.</p></div>';

  const history = rows.map((r) => `<tr><td>${new Date(r.created*1000).toLocaleDateString('en-US')}</td><td>${money(r.sale,r.currency)}</td><td>${money(r.commission,r.currency)}</td><td><span class="status">${esc(r.status)}</span></td></tr>`).join('');

  return render('Ambassador earnings', `<h1>Ambassador Earnings</h1><p>Hello <strong>${esc(ambassador.ambassadorName || '')}</strong>. Commission rate: <strong>${esc(ambassador.commissionRate)}%</strong>.</p><p class="muted">Referral ID: ${esc(ambassador.referralId)}</p><div class="grid">${summary}</div><div class="card" style="margin-top:16px"><h2>Payout account</h2><p>${payoutConnected ? 'Connected for automatic Nigeria payouts.' : `Not connected. <a href="/api/affiliate/payout-setup?token=${encodeURIComponent(token)}">Set up payout account</a>.`}</p></div><div class="card" style="margin-top:16px"><h2>Sales history</h2>${history ? `<div style="overflow:auto"><table><thead><tr><th>Date</th><th>Sale</th><th>Commission</th><th>Status</th></tr></thead><tbody>${history}</tbody></table></div>` : '<p>No sales yet.</p>'}<p class="muted">Commissions normally remain pending for 14 days to allow for refunds or payment reversals.</p></div>`);
};

export const config = { path: '/api/affiliate/dashboard' };
