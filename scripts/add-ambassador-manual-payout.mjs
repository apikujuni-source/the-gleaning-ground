import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const siteId = '16d8529d-ae7b-4a0b-a0d9-7f9923ebc7a1';
const endpoint = '/api/admin/affiliate-payout';
const marker = 'data-ambassador-manual-payout="true"';

let html = await readFile(indexPath, 'utf8');
if (html.includes(marker)) {
  console.log('Ambassador manual payout control already installed.');
  process.exit(0);
}

const runtime = `
<script ${marker}>
(() => {
  const SITE_ID = '${siteId}';
  const ENDPOINT = '${endpoint}';
  const AUTH_ORIGIN = 'https://api.netlify.com';
  const TOKEN_KEY = 'divine_ambassador_affiliate_admin_token';

  const currentSlug = () => {
    const match = String(location.hash || '').match(/#\\/collections\\/ambassador_management\\/entries\\/([^/?#]+)/i);
    if (!match) return '';
    try { return decodeURIComponent(match[1]).trim().toLowerCase(); } catch { return ''; }
  };

  const clearToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} };
  const authorize = ({ force = false } = {}) => {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(TOKEN_KEY);
        if (cached) return Promise.resolve(cached);
      } catch {}
    }
    clearToken();
    return new Promise((resolve, reject) => {
      const popup = window.open(
        AUTH_ORIGIN + '/auth?provider=github&site_id=' + encodeURIComponent(SITE_ID) + '&scope=repo',
        'ambassador-payout-auth',
        'width=720,height=760,resizable=yes,scrollbars=yes'
      );
      if (!popup) return reject(new Error('Please allow the GitHub authorization pop-up and try again.'));
      let settled = false;
      const finish = (error, token) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
        try { if (!popup.closed) popup.close(); } catch {}
        error ? reject(error) : resolve(token);
      };
      const onMessage = (event) => {
        if (event.origin !== AUTH_ORIGIN || typeof event.data !== 'string') return;
        if (event.data === 'authorizing:github') {
          try { event.source?.postMessage('authorizing:github', AUTH_ORIGIN); } catch {}
          return;
        }
        const prefix = 'authorization:github:success:';
        if (event.data.startsWith(prefix)) {
          try {
            const payload = JSON.parse(event.data.slice(prefix.length));
            const token = String(payload?.token || payload?.access_token || '').trim();
            if (!token) throw new Error('GitHub authorization did not return a token.');
            try { sessionStorage.setItem(TOKEN_KEY, token); } catch {}
            finish(null, token);
          } catch (error) { finish(error); }
        } else if (event.data.startsWith('authorization:github:error:')) {
          finish(new Error('GitHub authorization was not completed.'));
        }
      };
      window.addEventListener('message', onMessage);
      const timeout = setTimeout(() => finish(new Error('GitHub authorization timed out.')), 90000);
    });
  };

  const api = async (payload, { forceAuth = false } = {}) => {
    let token = await authorize({ force: forceAuth });
    let response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify(payload)
    });
    if (response.status === 401 || response.status === 403) {
      clearToken();
      token = await authorize({ force: true });
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || 'Could not update payout record.');
    return result;
  };

  const formatMoney = (amount, currency) => {
    try { return new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount || 0) / 100); }
    catch { return currency + ' ' + (Number(amount || 0) / 100).toFixed(2); }
  };

  const sha256 = async (file) => {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(9,20,32,.56);display:none;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="amb-payout-title" style="background:#fff;width:min(620px,100%);max-height:92vh;overflow:auto;border-radius:16px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.28);font:14px system-ui;color:#172536"><h2 id="amb-payout-title" style="margin:0 0 8px;color:#173b62">Record ambassador payout</h2><p id="amb-payout-summary" style="margin:0 0 18px;color:#5f6d7b"></p><form id="amb-payout-form"><label style="display:block;font-weight:700;margin:12px 0 5px">Currency<select name="currency" required style="width:100%;padding:10px;border:1px solid #cbd4dc;border-radius:8px"></select></label><label style="display:block;font-weight:700;margin:12px 0 5px">Payment method<input name="method" value="Bank transfer" required maxlength="80" style="box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd4dc;border-radius:8px"></label><label style="display:block;font-weight:700;margin:12px 0 5px">Transaction / payment reference<input name="reference" required maxlength="160" autocomplete="off" style="box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd4dc;border-radius:8px"></label><div style="font-size:12px;color:#697785;margin-top:4px">Use the transfer confirmation/reference only. Do not enter bank account numbers.</div><label style="display:block;font-weight:700;margin:12px 0 5px">Payment date<input name="payoutDate" type="date" required style="box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd4dc;border-radius:8px"></label><label style="display:block;font-weight:700;margin:12px 0 5px">Optional note<textarea name="note" maxlength="300" rows="3" style="box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd4dc;border-radius:8px"></textarea></label><label style="display:block;font-weight:700;margin:12px 0 5px">Optional receipt file<input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" style="box-sizing:border-box;width:100%;padding:8px;border:1px solid #cbd4dc;border-radius:8px"></label><div style="font-size:12px;color:#697785;line-height:1.45;margin-top:4px">For privacy, the receipt itself is not uploaded. Only its filename, size, file type, and SHA-256 fingerprint are recorded so the original receipt can be verified later.</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px"><button type="button" id="amb-payout-cancel" style="padding:10px 15px;border:1px solid #bcc7d0;border-radius:8px;background:#fff;cursor:pointer">Cancel</button><button type="submit" id="amb-payout-submit" style="padding:10px 15px;border:0;border-radius:8px;background:#173b62;color:#fff;font-weight:800;cursor:pointer">Mark paid</button></div></form></div>';
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#amb-payout-form');
  const currencySelect = form.elements.currency;
  const summary = overlay.querySelector('#amb-payout-summary');
  const submit = overlay.querySelector('#amb-payout-submit');
  const cancel = overlay.querySelector('#amb-payout-cancel');
  let preview = null;
  let activeSlug = '';

  const updateSummary = () => {
    const group = preview?.groups?.find((item) => item.currency === currencySelect.value);
    summary.textContent = group
      ? preview.ambassadorName + ': ' + formatMoney(group.amount, group.currency) + ' across ' + group.count + ' available commission' + (group.count === 1 ? '' : 's') + '.'
      : '';
  };
  currencySelect.addEventListener('change', updateSummary);
  cancel.addEventListener('click', () => { overlay.style.display = 'none'; });
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.style.display = 'none'; });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const group = preview?.groups?.find((item) => item.currency === currencySelect.value);
    if (!group) return;
    if (!confirm('Confirm that you have already sent ' + formatMoney(group.amount, group.currency) + ' to ' + preview.ambassadorName + '? This will mark the included commissions as paid.')) return;
    submit.disabled = true;
    submit.textContent = 'Recording…';
    try {
      const file = form.elements.receipt.files?.[0] || null;
      let receipt = null;
      if (file) {
        if (file.size > 25 * 1024 * 1024) throw new Error('Choose a receipt file smaller than 25 MB.');
        receipt = { name: file.name, type: file.type, size: file.size, sha256: await sha256(file) };
      }
      const result = await api({
        slug: activeSlug,
        action: 'record',
        currency: currencySelect.value,
        method: form.elements.method.value,
        reference: form.elements.reference.value,
        payoutDate: form.elements.payoutDate.value,
        note: form.elements.note.value,
        receipt
      });
      overlay.style.display = 'none';
      alert('Payout recorded successfully.\\n\\n' + formatMoney(result.amount, result.currency) + ' marked paid across ' + result.commissionCount + ' commission' + (result.commissionCount === 1 ? '' : 's') + '.\\nBatch: ' + result.batchId + (result.receiptFingerprintRecorded ? '\\nReceipt fingerprint recorded.' : ''));
      form.reset();
    } catch (error) {
      alert(String(error?.message || error));
    } finally {
      submit.disabled = false;
      submit.textContent = 'Mark paid';
    }
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Record ambassador payout';
  button.style.cssText = 'position:fixed;right:18px;bottom:72px;z-index:99999;border:0;border-radius:999px;padding:12px 16px;background:#2f6a4f;color:#fff;font:700 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer;display:none';
  document.body.appendChild(button);

  const setVisible = () => { button.style.display = currentSlug() ? 'block' : 'none'; };
  setVisible();
  addEventListener('hashchange', setVisible);

  button.addEventListener('click', async () => {
    const slug = currentSlug();
    if (!slug) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Checking…';
    try {
      const result = await api({ slug, action: 'preview' });
      if (!Array.isArray(result.groups) || result.groups.length === 0) {
        alert('No commissions are currently available for payout for this ambassador.');
        return;
      }
      activeSlug = slug;
      preview = result;
      currencySelect.innerHTML = result.groups.map((group) => '<option value="' + group.currency + '">' + group.currency + ' — ' + formatMoney(group.amount, group.currency) + '</option>').join('');
      form.elements.method.value = 'Bank transfer';
      form.elements.reference.value = '';
      form.elements.payoutDate.value = new Date().toISOString().slice(0, 10);
      form.elements.note.value = '';
      form.elements.receipt.value = '';
      updateSummary();
      overlay.style.display = 'flex';
      form.elements.reference.focus();
    } catch (error) {
      alert(String(error?.message || error));
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
})();
</script>`;

if (!html.includes('</body>')) throw new Error('Could not locate </body> in generated admin page.');
html = html.replace('</body>', `${runtime}\n</body>`);
await writeFile(indexPath, html, 'utf8');

const check = await readFile(indexPath, 'utf8');
for (const required of [marker, 'Record ambassador payout', endpoint, 'SHA-256 fingerprint']) {
  if (!check.includes(required)) throw new Error(`Ambassador manual payout control missing: ${required}`);
}

console.log('Added secure manual ambassador payout control.');
