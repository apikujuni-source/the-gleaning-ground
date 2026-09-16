import { getStore, getDeployStore } from '@netlify/blobs';
import seedApplications from '../lib/ambassador-application-seed.mjs';
import { json, verifyGithubAdmin } from '../lib/affiliate-core.mjs';

const STORE = 'ambassador-applications';

function clean(value, max = 1000) {
  return String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

function appStore() {
  const production = Netlify.context?.deploy?.context === 'production';
  return production
    ? getStore(STORE, { consistency: 'strong' })
    : getDeployStore(STORE);
}

async function allApplications() {
  const byId = new Map(seedApplications.map((item) => [item.id, { ...item }]));
  const store = appStore();
  const { blobs } = await store.list({ prefix: 'application/' });
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' });
    if (value?.id) byId.set(value.id, value);
  }
  return [...byId.values()].sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const authorization = String(request.headers.get('authorization') || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!(await verifyGithubAdmin(token))) return json(403, { ok: false, error: 'ADMIN_REQUIRED' });

  let payload = {};
  try { payload = await request.json(); } catch { return json(400, { ok: false, error: 'INVALID_JSON' }); }
  const action = String(payload?.action || 'list').toLowerCase();
  const applications = await allApplications();

  if (action === 'list') return json(200, { ok: true, applications });
  if (action !== 'setstatus') return json(400, { ok: false, error: 'INVALID_ACTION' });

  const id = clean(payload?.id, 120);
  const app = applications.find((item) => item.id === id);
  if (!app) return json(404, { ok: false, error: 'APPLICATION_NOT_FOUND' });

  const allowed = new Set(['pending', 'approved_email_pending', 'approved_email_failed', 'approved']);
  const status = clean(payload?.status, 40).toLowerCase();
  if (!allowed.has(status)) return json(400, { ok: false, error: 'INVALID_STATUS' });

  const updated = {
    ...app,
    name: clean(payload?.name || app.name, 160),
    status,
    approvedAt: clean(payload?.approvedAt || app.approvedAt, 80),
    approvalEmailSentAt: clean(payload?.approvalEmailSentAt || app.approvalEmailSentAt, 80),
    emailErrorAt: clean(payload?.emailErrorAt || app.emailErrorAt, 80),
    ambassadorSlug: clean(payload?.ambassadorSlug || app.ambassadorSlug, 140),
    referralId: clean(payload?.referralId || app.referralId, 100),
    referralLink: clean(payload?.referralLink || app.referralLink, 500)
  };
  await appStore().setJSON(`application/${app.id}.json`, updated);
  return json(200, { ok: true, application: updated });
};
