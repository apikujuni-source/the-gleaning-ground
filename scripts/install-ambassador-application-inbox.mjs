import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const endpoint = '/api/admin/ambassador-applications';
const siteId = '16d8529d-ae7b-4a0b-a0d9-7f9923ebc7a1';
const marker = 'data-ambassador-application-inbox="true"';

let html = await readFile(indexPath, 'utf8');
if (html.includes(marker)) process.exit(0);

const runtime = `
<script ${marker}>
(() => {
  const SITE_ID = '${siteId}';
  const ENDPOINT = '${endpoint}';
  const AUTH_ORIGIN = 'https://api.netlify.com';
  const TOKEN_KEY = 'divine_ambassador_applications_admin_token';

  const clearToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} };
  const authorize = ({ force = false } = {}) => {
    if (!force) {
      try { const cached = sessionStorage.getItem(TOKEN_KEY); if (cached) return Promise.resolve(cached); } catch {}
    }
    clearToken();
    return new Promise((resolve, reject) => {
      const popup = window.open(
        AUTH_ORIGIN + '/auth?provider=github&site_id=' + encodeURIComponent(SITE_ID) + '&scope=repo',
        'ambassador-application-auth',
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

  const api = async (payload, force = false) => {
    let token = await authorize({ force });
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
    if (!response.ok) {
      const error = new Error(result?.error || 'Request failed.');
      error.result = result;
      throw error;
    }
    return result;
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const formatDate = (value) => {
    try { return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return String(value || ''); }
  };

  const page = document.createElement('div');
  page.id = 'ambassador-application-inbox';
  page.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#f4f6f8;display:none;overflow:auto;font-family:system-ui,-apple-system,sans-serif;color:#172536';
  page.innerHTML = `
    <div style="position:sticky;top:0;z-index:2;background:#173b62;color:#fff;padding:16px 22px;box-shadow:0 2px 12px rgba(0,0,0,.12)">
      <div style="max-width:1180px;margin:0 auto;display:flex;gap:12px;align-items:center;justify-content:space-between">
        <div><div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Admin</div><h1 style="font-size:22px;margin:2px 0 0">Ambassador Applications</h1></div>
        <div style="display:flex;gap:8px"><button id="amb-app-refresh" type="button" style="padding:9px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;cursor:pointer">Refresh</button><button id="amb-app-close" type="button" style="padding:9px 13px;border-radius:8px;border:0;background:#fff;color:#173b62;font-weight:750;cursor:pointer">Back to Admin</button></div>
      </div>
    </div>
    <main style="max-width:1180px;margin:0 auto;padding:24px 20px 48px">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px">
        <button data-filter="pending" type="button" class="amb-app-filter" style="padding:8px 12px;border:0;border-radius:999px;background:#173b62;color:#fff;font-weight:700;cursor:pointer">Pending</button>
        <button data-filter="all" type="button" class="amb-app-filter" style="padding:8px 12px;border:1px solid #c7d0d9;border-radius:999px;background:#fff;color:#173b62;font-weight:700;cursor:pointer">All</button>
        <span id="amb-app-count" style="color:#6a7785;font-size:14px"></span>
      </div>
      <div id="amb-app-notice" style="display:none;margin-bottom:16px;padding:12px 14px;border-radius:10px;background:#fff3d8;color:#694c10"></div>
      <div id="amb-app-list"></div>
    </main>`;
  document.body.appendChild(page);

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.textContent = 'Ambassador Applications';
  launch.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99997;border:0;border-radius:999px;padding:12px 17px;background:#173b62;color:#fff;font:750 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer';
  document.body.appendChild(launch);

  let applications = [];
  let filter = 'pending';
  const list = page.querySelector('#amb-app-list');
  const count = page.querySelector('#amb-app-count');
  const notice = page.querySelector('#amb-app-notice');

  const isPending = app => app.status === 'pending' || app.status === 'approved_email_failed' || app.status === 'approved_email_pending';
  const render = () => {
    const visible = filter === 'pending' ? applications.filter(isPending) : applications;
    count.textContent = visible.length + ' application' + (visible.length === 1 ? '' : 's');
    if (!visible.length) {
      list.innerHTML = '<div style="background:#fff;border-radius:14px;padding:28px;text-align:center;color:#647282">No applications in this view.</div>';
      return;
    }
    list.innerHTML = visible.map(app => {
      const missingName = !String(app.name || '').trim();
      const approved = app.status === 'approved';
      const failed = app.status === 'approved_email_failed';
      const pendingEmail = app.status === 'approved_email_pending';
      const actionLabel = failed || pendingEmail ? 'Resend approval email' : approved ? 'Approved' : 'Approve & send message';
      const disabled = approved ? 'disabled' : '';
      return `<article data-app-id="${esc(app.id)}" style="background:#fff;border:1px solid #e2e7eb;border-radius:14px;padding:20px;margin-bottom:14px;box-shadow:0 5px 18px rgba(17,35,57,.04)">
        <div style="display:flex;gap:14px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap">
          <div style="min-width:260px;flex:1">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#71808f;margin-bottom:4px">${esc(formatDate(app.submittedAt))}</div>
            <h2 style="font-size:20px;margin:0 0 4px;color:#173b62">${esc(app.name || app.email || 'Unnamed applicant')}</h2>
            <div style="color:#536270">${esc(app.email || '')}${app.phone ? ' · ' + esc(app.phone) : ''}</div>
          </div>
          <span style="padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;background:${approved ? '#e9f7ee' : failed ? '#fff0e6' : '#eef3f8'};color:${approved ? '#23633d' : failed ? '#8a3f13' : '#36536e'}">${esc(app.status || 'pending')}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;font-size:14px">
          <div><strong>Location</strong><br>${esc(app.location || '—')}</div>
          <div><strong>Primary platform</strong><br>${esc(app.primaryPlatform || '—')}</div>
          <div><strong>Audience size</strong><br>${esc(app.audienceSize || '—')}</div>
          <div><strong>Organization</strong><br>${esc(app.organization || '—')}</div>
          <div><strong>Book status</strong><br>${esc(app.bookStatus || '—')}</div>
          <div><strong>Program terms accepted</strong><br>${app.programUnderstanding ? 'Yes' : 'No'}</div>
        </div>
        <div style="margin-top:16px;padding:13px 14px;border-radius:10px;background:#f7f9fb;line-height:1.55"><strong>Why they want to join</strong><br>${esc(app.why || '—')}</div>
        ${app.referralLink ? `<div style="margin-top:12px;font-size:13px;color:#526170"><strong>Referral link:</strong> ${esc(app.referralLink)}</div>` : ''}
        <div style="margin-top:18px;display:flex;gap:10px;align-items:end;flex-wrap:wrap">
          ${missingName && !approved ? `<label style="flex:1;min-width:260px;font-weight:700;color:#8a3f13">Applicant name was not captured by the original form<input class="amb-app-name" type="text" placeholder="Enter name only for this legacy application" style="box-sizing:border-box;width:100%;margin-top:5px;padding:10px;border:1px solid #d4b08f;border-radius:8px;font:inherit"></label>` : ''}
          <button type="button" class="amb-app-approve" ${disabled} style="margin-left:auto;padding:11px 15px;border:0;border-radius:9px;background:${approved ? '#9ba8b3' : '#2f6a4f'};color:#fff;font-weight:800;cursor:${approved ? 'default' : 'pointer'}">${actionLabel}</button>
        </div>
      </article>`;
    }).join('');
  };

  const load = async () => {
    list.innerHTML = '<div style="padding:26px;text-align:center;color:#647282">Loading applications…</div>';
    notice.style.display = 'none';
    try {
      const result = await api({ action: 'list' });
      applications = Array.isArray(result.applications) ? result.applications : [];
      render();
    } catch (error) {
      list.innerHTML = '<div style="background:#fff;border-radius:14px;padding:24px;color:#8a2f2f">' + esc(error.message || error) + '</div>';
    }
  };

  launch.addEventListener('click', async () => { page.style.display = 'block'; document.body.style.overflow = 'hidden'; await load(); });
  page.querySelector('#amb-app-close').addEventListener('click', () => { page.style.display = 'none'; document.body.style.overflow = ''; });
  page.querySelector('#amb-app-refresh').addEventListener('click', load);
  page.querySelectorAll('.amb-app-filter').forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    page.querySelectorAll('.amb-app-filter').forEach(item => { item.style.background = item === btn ? '#173b62' : '#fff'; item.style.color = item === btn ? '#fff' : '#173b62'; });
    render();
  }));

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('.amb-app-approve');
    if (!button || button.disabled) return;
    const card = button.closest('[data-app-id]');
    const id = card?.dataset?.appId || '';
    const app = applications.find(item => item.id === id);
    if (!app) return;
    const nameInput = card.querySelector('.amb-app-name');
    const approvedName = String(nameInput?.value || app.name || '').trim();
    if (!approvedName) {
      alert('This older application reached Netlify without a name. Enter the applicant’s name in the highlighted field before approving it.');
      nameInput?.focus();
      return;
    }
    const resend = app.status === 'approved_email_failed' || app.status === 'approved_email_pending';
    if (!confirm((resend ? 'Resend the approval email to ' : 'Approve this application and send the approval email to ') + app.email + '?')) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = resend ? 'Sending…' : 'Approving…';
    try {
      const result = await api({ action: resend ? 'resend' : 'approve', id, name: approvedName });
      const index = applications.findIndex(item => item.id === id);
      if (index >= 0) applications[index] = result.application;
      notice.textContent = 'Approved successfully and the approval message was sent to ' + result.application.email + '.';
      notice.style.background = '#e9f7ee'; notice.style.color = '#23633d'; notice.style.display = 'block';
      render();
    } catch (error) {
      const partial = error.result?.application;
      if (partial) {
        const index = applications.findIndex(item => item.id === id);
        if (index >= 0) applications[index] = partial;
        render();
        notice.textContent = 'The ambassador record was created, but the approval email could not be sent. Use “Resend approval email” on this application.';
      } else {
        notice.textContent = String(error.message || error);
      }
      notice.style.background = '#fff0e6'; notice.style.color = '#8a3f13'; notice.style.display = 'block';
    } finally {
      button.disabled = false;
      if (document.body.contains(button)) button.textContent = original;
    }
  });
})();
</script>`;

if (!html.includes('</body>')) throw new Error('Could not locate </body> in generated admin page.');
html = html.replace('</body>', `${runtime}\n</body>`);

if (!html.includes('Open Ambassador Applications →')) {
  html = html.replace(
    '<p><a href="#/collections/ambassador_management">Open Ambassador Management →</a></p>',
    '<p><a href="#/collections/ambassador_management">Open Ambassador Management →</a></p>\n      <p><a href="#" onclick="event.preventDefault();document.querySelector(\'button\')?.blur();document.getElementById(\'ambassador-application-inbox\').style.display=\'block\';document.body.style.overflow=\'hidden\';">Open Ambassador Applications →</a></p>'
  );
}

await writeFile(indexPath, html, 'utf8');
const check = await readFile(indexPath, 'utf8');
for (const required of [marker, 'Ambassador Applications', 'Approve & send message', endpoint]) {
  if (!check.includes(required)) throw new Error(`Ambassador application inbox missing: ${required}`);
}
console.log('Installed Ambassador Applications admin inbox with one-click approval and approval-email delivery.');
