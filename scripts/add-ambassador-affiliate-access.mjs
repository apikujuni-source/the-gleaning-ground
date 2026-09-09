import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const siteId = '16d8529d-ae7b-4a0b-a0d9-7f9923ebc7a1';
const endpoint = '/api/admin/affiliate-access-link';
const marker = 'data-ambassador-affiliate-access="true"';

let html = await readFile(indexPath, 'utf8');
if (html.includes(marker)) {
  console.log('Ambassador affiliate access control already installed.');
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

  const setVisible = (button) => {
    button.style.display = currentSlug() ? 'block' : 'none';
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
        'ambassador-affiliate-auth',
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

  const requestLinks = async (slug, token) => fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ slug })
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Affiliate access links';
  button.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;border:0;border-radius:999px;padding:12px 16px;background:#173b62;color:#fff;font:700 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer;display:none';
  setVisible(button);
  document.body.appendChild(button);

  addEventListener('hashchange', () => setVisible(button));

  button.addEventListener('click', async () => {
    const slug = currentSlug();
    if (!slug) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating…';
    try {
      let token = await authorize();
      let response = await requestLinks(slug, token);
      if (response.status === 401 || response.status === 403) {
        clearToken();
        token = await authorize({ force: true });
        response = await requestLinks(slug, token);
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Could not generate affiliate links.');
      const text =
        'Earnings dashboard:\\n' + result.dashboardUrl +
        '\\n\\nPayout setup:\\n' + result.payoutSetupUrl +
        '\\n\\nLinks expire in ' + result.expiresInDays + ' days.';
      try { await navigator.clipboard.writeText(text); } catch {}
      window.prompt('Private ambassador links (copied to clipboard when permitted):', text);
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
for (const required of [marker, 'Affiliate access links', endpoint]) {
  if (!check.includes(required)) throw new Error(`Affiliate admin access control missing: ${required}`);
}

console.log('Added secure Ambassador Management affiliate access-link control.');
