import { json, verifyGithubAdmin } from '../lib/affiliate-core.mjs';

const REPO = 'apikujuni-source/the-gleaning-ground';
const AMBASSADOR_FOLDER = 'content/divine-blueprint/approved-ambassadors';
const BASE_URL = 'https://divineblueprint.gleaningground.com/';
const COMMISSION_RATE = 25;

function clean(value, max = 1000) {
  return String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

function namePart(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 18) || 'AMBASSADOR';
}
function shortHash(value) {
  let hash = 2166136261;
  for (const ch of String(value || '')) { hash ^= ch.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(-5);
}
function slugPart(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52) || 'ambassador';
}
function referralFor(name, email) { return `AMB-${namePart(name)}-${shortHash(`${name}|${email}`)}`; }

async function github(token, path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function approvalMailto(email, referralLink) {
  const subject = 'Welcome to the Divine Blueprint Ambassador Program';
  const body = [
    'Congratulations! Your application to become a Divine Blueprint Ambassador has been approved.', '',
    'We’re excited to have you join us in helping share the message of The Divine Blueprint.', '',
    'Your personal referral link:', referralLink, '',
    `Your standard ambassador commission is ${COMMISSION_RATE}% on qualifying attributed sales.`, '',
    'Your Ambassador Toolkit will be sent to you shortly.', '', 'Welcome to the Ambassador Program!'
  ].join('\n');
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function ensureAmbassadorRecord(token, app, approvedName) {
  const name = clean(approvedName || app.name, 160);
  const email = clean(app.email, 254).toLowerCase();
  if (!name) throw new Error('NAME_REQUIRED');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('VALID_EMAIL_REQUIRED');
  const referralId = referralFor(name, email);
  const referralLink = `${BASE_URL}?ref=${encodeURIComponent(referralId)}`;
  const date = new Date().toISOString().slice(0, 10);
  const idSuffix = clean(app.id, 80).replace(/[^a-zA-Z0-9]+/g, '').slice(-8).toLowerCase() || shortHash(email).toLowerCase();
  const slug = `${date}-${slugPart(name)}-${idSuffix}`;
  const filePath = `${AMBASSADOR_FOLDER}/${slug}.json`;
  const apiPath = `/contents/${encodeURIComponent(filePath).replaceAll('%2F', '/')}`;
  const existing = await github(token, `${apiPath}?ref=main`);
  if (existing.response.status !== 200 && existing.response.status !== 404) throw new Error(existing.body?.message || 'AMBASSADOR_CHECK_FAILED');
  if (existing.response.status === 404) {
    const record = {
      ambassadorName: name,
      email,
      phone: clean(app.phone, 80),
      location: clean(app.location, 180),
      status: 'Active',
      approvedDate: date,
      commissionRate: COMMISSION_RATE,
      referralId,
      referralLink,
      approvalEmail: approvalMailto(email, referralLink),
      notes: `Approved from Ambassador Application ${clean(app.id,120)}. Platform: ${clean(app.primaryPlatform,120) || 'Not provided'}. Audience: ${clean(app.audienceSize,120) || 'Not provided'}. Organization: ${clean(app.organization,240) || 'Not provided'}. Book status: ${clean(app.bookStatus,160) || 'Not provided'}.`
    };
    const created = await github(token, apiPath, {
      method: 'PUT',
      body: JSON.stringify({ message: `Approve ambassador application: ${name}`, content: Buffer.from(JSON.stringify(record, null, 2) + '\n').toString('base64'), branch: 'main' })
    });
    if (!created.response.ok) throw new Error(created.body?.message || 'AMBASSADOR_CREATE_FAILED');
  }
  return { name, email, referralId, referralLink, slug };
}

async function sendApprovalEmail(record) {
  const secret = String(Netlify.env.get('NETLIFY_EMAILS_SECRET') || '').trim();
  const siteUrl = String(Netlify.env.get('URL') || 'https://gleaningground.com').replace(/\/$/, '');
  if (!secret) throw new Error('EMAIL_NOT_CONFIGURED');
  const response = await fetch(`${siteUrl}/.netlify/functions/emails/ambassador-approval`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'netlify-emails-secret': secret },
    body: JSON.stringify({
      from: 'The Gleaning Ground <info@gleaningground.com>',
      to: record.email,
      subject: 'Welcome to the Divine Blueprint Ambassador Program',
      parameters: { name: record.name, referralLink: record.referralLink, commissionRate: COMMISSION_RATE }
    })
  });
  if (!response.ok) {
    console.error('Ambassador approval email failed', response.status, (await response.text().catch(() => '')).slice(0, 500));
    throw new Error('EMAIL_SEND_FAILED');
  }
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const authorization = String(request.headers.get('authorization') || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!(await verifyGithubAdmin(token))) return json(403, { ok: false, error: 'ADMIN_REQUIRED' });
  let payload = {};
  try { payload = await request.json(); } catch { return json(400, { ok: false, error: 'INVALID_JSON' }); }
  const app = payload?.application && typeof payload.application === 'object' ? payload.application : {};
  let record;
  try { record = await ensureAmbassadorRecord(token, app, clean(payload?.name, 160)); }
  catch (error) { return json(400, { ok: false, error: error?.message || 'APPROVAL_FAILED' }); }

  const state = {
    name: record.name,
    approvedAt: new Date().toISOString(),
    ambassadorSlug: record.slug,
    referralId: record.referralId,
    referralLink: record.referralLink
  };
  try {
    await sendApprovalEmail(record);
    return json(200, { ok: true, status: 'approved', approvalEmailSentAt: new Date().toISOString(), ...state });
  } catch (error) {
    return json(502, { ok: false, error: error?.message || 'EMAIL_SEND_FAILED', status: 'approved_email_failed', emailErrorAt: new Date().toISOString(), ...state });
  }
};

export const config = { path: '/api/admin/ambassador-approve' };
