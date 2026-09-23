import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const endpoint = '/api/admin/post-comments';
const siteId = '16d8529d-ae7b-4a0b-a0d9-7f9923ebc7a1';
const marker = 'data-post-comments-admin="true"';

let html = await readFile(indexPath, 'utf8');
if (html.includes(marker)) process.exit(0);

const runtime = `
<script ${marker}>
(() => {
  const SITE_ID = '${siteId}';
  const ENDPOINT = '${endpoint}';
  const AUTH_ORIGIN = 'https://api.netlify.com';
  const TOKEN_KEY = 'post_comments_admin_token';

  const clearToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} };
  const authorize = ({ force = false } = {}) => {
    if (!force) {
      try { const cached = sessionStorage.getItem(TOKEN_KEY); if (cached) return Promise.resolve(cached); } catch {}
    }
    clearToken();
    return new Promise((resolve, reject) => {
      const popup = window.open(AUTH_ORIGIN + '/auth?provider=github&site_id=' + encodeURIComponent(SITE_ID) + '&scope=repo', 'post-comments-auth', 'width=720,height=760,resizable=yes,scrollbars=yes');
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

  const api = async (payload) => {
    let token = await authorize();
    const send = () => fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(payload) });
    let response = await send();
    if (response.status === 401 || response.status === 403) {
      clearToken();
      token = await authorize({ force: true });
      response = await send();
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || 'Request failed.');
    return result;
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const formatDate = value => { try { return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return String(value || ''); } };

  const page = document.createElement('div');
  page.id = 'post-comments-admin';
  page.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#f4f6f8;display:none;overflow:auto;font-family:system-ui,-apple-system,sans-serif;color:#172536';
  page.innerHTML = '<div style="position:sticky;top:0;z-index:2;background:#17392f;color:#fff;padding:16px 22px;box-shadow:0 2px 12px rgba(0,0,0,.12)"><div style="max-width:1000px;margin:0 auto;display:flex;gap:12px;align-items:center;justify-content:space-between"><div><div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Admin</div><h1 style="font-size:22px;margin:2px 0 0">Post Comments</h1></div><div style="display:flex;gap:8px"><button id="post-comments-refresh" type="button" style="padding:9px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;cursor:pointer">Refresh</button><button id="post-comments-close" type="button" style="padding:9px 13px;border-radius:8px;border:0;background:#fff;color:#17392f;font-weight:750;cursor:pointer">Back to Admin</button></div></div></div><main style="max-width:1000px;margin:0 auto;padding:24px 20px 48px"><p id="post-comments-count" style="color:#6a7785;font-size:14px;margin:0 0 16px"></p><div id="post-comments-list"></div></main>';

  const launch = document.createElement('button');
  launch.id = 'post-comments-launch';
  launch.type = 'button';
  launch.textContent = 'Post Comments';
  launch.style.cssText = 'position:fixed;right:18px;bottom:72px;z-index:2147483646;border:0;border-radius:999px;padding:12px 17px;background:#17392f;color:#fff;font:750 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer';

  // Decap replaces the admin document body while it mounts; keep this panel attached.
  const mount = () => {
    if (!document.body) return;
    if (!page.isConnected) document.body.appendChild(page);
    if (!launch.isConnected) document.body.appendChild(launch);
  };
  mount();

  let comments = [];
  const list = page.querySelector('#post-comments-list');
  const count = page.querySelector('#post-comments-count');

  const render = () => {
    count.textContent = comments.length + ' most recent comment' + (comments.length === 1 ? '' : 's') + ' across all posts. Comments are published immediately; delete any that should not appear.';
    if (!comments.length) { list.innerHTML = '<div style="background:#fff;border-radius:14px;padding:28px;text-align:center;color:#647282">No comments yet.</div>'; return; }
    list.innerHTML = comments.map(comment => '<article data-comment-id="' + esc(comment.id) + '" style="background:#fff;border:1px solid #e2e7eb;border-radius:14px;padding:18px 20px;margin-bottom:12px"><div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap"><div style="min-width:240px;flex:1"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#71808f;margin-bottom:4px">' + esc(formatDate(comment.createdAt)) + '</div><strong style="font-size:17px;color:#17392f">' + esc(comment.name) + '</strong><div style="font-size:13px;color:#536270;margin-top:2px">on <a href="' + esc(comment.postPath) + '#comments" target="_blank" rel="noopener" style="color:#a95f45">' + esc(comment.postTitle || comment.postPath) + '</a></div></div><button type="button" class="post-comment-delete" style="padding:9px 13px;border:0;border-radius:9px;background:#a13d2d;color:#fff;font-weight:750;cursor:pointer">Delete</button></div><p style="margin:12px 0 0;white-space:pre-line;line-height:1.55;overflow-wrap:anywhere">' + esc(comment.body) + '</p></article>').join('');
  };

  const load = async () => {
    list.innerHTML = '<div style="padding:26px;text-align:center;color:#647282">Loading comments…</div>';
    try { const result = await api({ action: 'list' }); comments = Array.isArray(result.comments) ? result.comments : []; render(); }
    catch (error) { list.innerHTML = '<div style="background:#fff;border-radius:14px;padding:24px;color:#8a2f2f">' + esc(error.message || error) + '</div>'; }
  };

  const open = async () => { page.style.display = 'block'; document.body.style.overflow = 'hidden'; await load(); };
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#post-comments-launch')) return;
    event.preventDefault();
    void open();
  }, true);
  page.querySelector('#post-comments-close').addEventListener('click', () => { page.style.display = 'none'; document.body.style.overflow = ''; });
  page.querySelector('#post-comments-refresh').addEventListener('click', load);

  list.addEventListener('click', async event => {
    const button = event.target.closest('.post-comment-delete');
    if (!button || button.disabled) return;
    const id = Number(button.closest('[data-comment-id]')?.dataset?.commentId);
    const comment = comments.find(item => item.id === id);
    if (!comment || !confirm('Delete this comment from ' + comment.name + '? This cannot be undone.')) return;
    button.disabled = true;
    button.textContent = 'Deleting…';
    try {
      await api({ action: 'delete', id });
      comments = comments.filter(item => item.id !== id);
      render();
    } catch (error) {
      alert(String(error.message || error));
      button.disabled = false;
      button.textContent = 'Delete';
    }
  });

  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pageshow', mount);
})();
</script>`;

if (!html.includes('</body>')) throw new Error('Could not locate </body> in generated admin page.');
html = html.replace('</body>', `${runtime}\n</body>`);
await writeFile(indexPath, html, 'utf8');
const check = await readFile(indexPath, 'utf8');
for (const required of [marker, 'Post Comments', endpoint]) if (!check.includes(required)) throw new Error(`Post comments admin missing: ${required}`);
console.log('Installed the Post Comments admin panel.');
