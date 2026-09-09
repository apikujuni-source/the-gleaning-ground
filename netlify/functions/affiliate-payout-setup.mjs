import {
  env,
  verifyAffiliateToken,
  findActiveAmbassador,
  findPaystackRecipient,
  paystackRequest
} from './_affiliate-core.mjs';

function page(title, body, status = 200) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#f6f3ec;color:#152235;margin:0}.wrap{max-width:680px;margin:48px auto;padding:28px}.card{background:#fff;border-radius:18px;padding:28px;box-shadow:0 12px 40px rgba(17,35,57,.08)}h1{margin-top:0;color:#173b62}label{display:block;font-weight:700;margin:16px 0 6px}input,select{box-sizing:border-box;width:100%;padding:12px;border:1px solid #ccd4dc;border-radius:9px;font:inherit}button{margin-top:20px;border:0;border-radius:9px;background:#173b62;color:white;padding:13px 18px;font-weight:800;cursor:pointer}.note{font-size:.92rem;color:#586575;line-height:1.55}.ok{padding:12px;background:#edf8f0;border-radius:9px}.err{padding:12px;background:#fff0f0;border-radius:9px}</style></head><body><div class="wrap"><div class="card">${body}</div></div></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }});
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async (request) => {
  const url = new URL(request.url);
  const token = request.method === 'GET' ? url.searchParams.get('token') : (await request.clone().formData()).get('token');
  const access = verifyAffiliateToken(token);
  if (!access) return page('Invalid link', '<h1>Link unavailable</h1><p class="err">This payout setup link is invalid or has expired. Request a new link from The Gleaning Ground.</p>', 403);

  const ambassador = await findActiveAmbassador(access.ref);
  if (!ambassador || ambassador.email !== access.email) {
    return page('Payout setup unavailable', '<h1>Payout setup unavailable</h1><p class="err">This ambassador account is not currently active.</p>', 403);
  }

  if (request.method === 'POST') {
    if (!env('PAYSTACK_SECRET_KEY')) {
      return page('Payout setup', '<h1>Payout setup</h1><p class="err">Nigeria automatic payouts are not activated yet. Please try again after the payout service is enabled.</p>', 503);
    }

    const form = await request.formData();
    const accountNumber = String(form.get('account_number') || '').trim();
    const bankCode = String(form.get('bank_code') || '').trim();
    if (!/^\d{10}$/.test(accountNumber) || !/^[A-Za-z0-9_-]{2,20}$/.test(bankCode)) {
      return page('Payout setup', '<h1>Check your details</h1><p class="err">Enter a valid 10-digit Nigerian bank account number and choose your bank.</p>', 400);
    }

    try {
      const existing = await findPaystackRecipient(ambassador.referralId);
      if (existing) {
        return page('Payout setup complete', `<h1>Payout setup complete</h1><p class="ok">Your payout account is already connected for ${esc(ambassador.ambassadorName || 'this ambassador account')}.</p><p><a href="/api/affiliate/dashboard?token=${encodeURIComponent(token)}">View earnings</a></p>`);
      }

      const resolved = await paystackRequest(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
      const accountName = String(resolved?.data?.account_name || '').trim();
      if (!accountName) throw new Error('The bank account could not be verified.');

      await paystackRequest('/transferrecipient', {
        method: 'POST',
        body: {
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
          description: 'Divine Blueprint Ambassador payouts',
          metadata: {
            referralId: ambassador.referralId,
            ambassadorEmail: ambassador.email
          }
        }
      });

      return page('Payout setup complete', `<h1>Payout setup complete</h1><p class="ok">Bank account verified for <strong>${esc(accountName)}</strong>. Eligible commissions can now be paid automatically after the hold period.</p><p class="note">The Gleaning Ground does not store your bank account number in the ambassador registry.</p><p><a href="/api/affiliate/dashboard?token=${encodeURIComponent(token)}">View earnings</a></p>`);
    } catch (error) {
      console.error('Affiliate payout setup failed', error);
      return page('Payout setup failed', `<h1>We could not connect that account</h1><p class="err">${esc(error?.message || 'Please check the bank details and try again.')}</p>`, 400);
    }
  }

  if (!env('PAYSTACK_SECRET_KEY')) {
    return page('Payout setup', `<h1>Ambassador payout setup</h1><p>Hello ${esc(ambassador.ambassadorName || '')}.</p><p class="err">Automatic Nigeria payouts are being activated. Your commissions will still be tracked, but bank setup is not available yet.</p>`, 503);
  }

  let banks = [];
  try {
    const result = await paystackRequest('/bank?currency=NGN');
    banks = Array.isArray(result?.data) ? result.data.filter((bank) => bank?.active !== false) : [];
  } catch (error) {
    console.error('Could not load Paystack banks', error);
  }
  const options = banks.map((bank) => `<option value="${esc(bank.code)}">${esc(bank.name)}</option>`).join('');

  return page('Ambassador payout setup', `<h1>Set up automatic payouts</h1><p>Hello ${esc(ambassador.ambassadorName || '')}. Connect the Nigerian bank account where you want to receive eligible Divine Blueprint ambassador commissions.</p><form method="post"><input type="hidden" name="token" value="${esc(token)}"><label for="bank_code">Bank</label><select id="bank_code" name="bank_code" required><option value="">Choose your bank</option>${options}</select><label for="account_number">Account number</label><input id="account_number" name="account_number" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" required><button type="submit">Verify and connect account</button></form><p class="note">Your account is verified before registration. Bank details are sent securely to the payout provider and are not written into the public ambassador registry.</p>`);
};

export const config = { path: '/api/affiliate/payout-setup' };
