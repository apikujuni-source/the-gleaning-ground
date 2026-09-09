import { createHmac, timingSafeEqual } from 'node:crypto';
import runtimeAmbassadors from './_lib/ambassador-registry.mjs';

export const ADMIN_GITHUB_LOGIN = 'apikujuni-source';
export const REPO = 'apikujuni-source/the-gleaning-ground';
export const AMBASSADOR_FOLDER = 'content/divine-blueprint/approved-ambassadors';
export const HOLD_DAYS = 14;

export function env(name) {
  return String(Netlify.env.get(name) || '').trim();
}

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export function normalizeRef(value) {
  const ref = String(value || '').trim().toUpperCase();
  return /^AMB-[A-Z0-9_-]{2,60}$/.test(ref) ? ref : '';
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : '';
}

async function githubRequest(url, token = '') {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'gleaningground-affiliate-engine',
    'x-github-api-version': '2022-11-28'
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}

export async function verifyGithubAdmin(token) {
  if (!token) return false;
  const response = await githubRequest('https://api.github.com/user', token);
  if (!response.ok) return false;
  const profile = await response.json();
  return String(profile?.login || '').toLowerCase() === ADMIN_GITHUB_LOGIN.toLowerCase();
}

function normalizedRuntimeAmbassadors() {
  return (Array.isArray(runtimeAmbassadors) ? runtimeAmbassadors : [])
    .map((record) => {
      const referralId = normalizeRef(record?.referralId);
      const email = normalizeEmail(record?.email);
      const slug = String(record?.slug || '').trim().toLowerCase();
      if (!referralId || !email || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) return null;
      return {
        slug,
        ambassadorName: String(record?.ambassadorName || '').trim().slice(0, 160),
        email,
        referralId,
        status: String(record?.status || '').trim(),
        commissionRate: Number.isFinite(Number(record?.commissionRate))
          ? Math.max(0, Math.min(100, Number(record.commissionRate)))
          : 25
      };
    })
    .filter(Boolean);
}

export async function getAmbassadors() {
  return normalizedRuntimeAmbassadors();
}

export async function findActiveAmbassador(ref) {
  const normalized = normalizeRef(ref);
  if (!normalized) return null;
  const records = normalizedRuntimeAmbassadors();
  return records.find((record) => record.referralId === normalized && record.status === 'Active') || null;
}

export async function findAmbassadorBySlug(slug) {
  const safe = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(safe)) return null;
  return normalizedRuntimeAmbassadors().find((record) => record.slug === safe) || null;
}

export function signAffiliateToken({ referralId, email, days = 30 }) {
  const secret = env('AFFILIATE_DASHBOARD_SECRET');
  if (!secret) throw new Error('AFFILIATE_DASHBOARD_SECRET is not configured.');
  const payload = {
    ref: normalizeRef(referralId),
    email: normalizeEmail(email),
    exp: Date.now() + days * 24 * 60 * 60 * 1000
  };
  if (!payload.ref || !payload.email) throw new Error('Invalid affiliate token payload.');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyAffiliateToken(token) {
  const secret = env('AFFILIATE_DASHBOARD_SECRET');
  if (!secret || !token || !String(token).includes('.')) return null;
  const [encoded, supplied] = String(token).split('.', 2);
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const ref = normalizeRef(payload?.ref);
    const email = normalizeEmail(payload?.email);
    const exp = Number(payload?.exp || 0);
    if (!ref || !email || !exp || Date.now() > exp) return null;
    return { ref, email, exp };
  } catch {
    return null;
  }
}

export async function stripeRequest(path, { method = 'GET', params } = {}) {
  const secret = env('STRIPE_SECRET_KEY');
  if (!secret) {
    const error = new Error('Stripe secret key is not configured.');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  const url = new URL(`https://api.stripe.com/v1${path}`);
  const options = {
    method,
    headers: { authorization: `Bearer ${secret}` }
  };

  if (method === 'GET' && params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  } else if (params) {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) form.set(key, String(value));
    }
    options.headers['content-type'] = 'application/x-www-form-urlencoded';
    options.body = form.toString();
  }

  const response = await fetch(url, options);
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Stripe request failed (${response.status}).`);
    error.status = response.status;
    error.stripe = body?.error;
    throw error;
  }
  return body;
}

export async function updateCheckoutMetadata(sessionId, metadata) {
  const params = {};
  for (const [key, value] of Object.entries(metadata)) {
    params[`metadata[${key}]`] = value == null ? '' : String(value);
  }
  return stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    params
  });
}

export async function listCheckoutSessions(params = {}) {
  const all = [];
  let startingAfter = '';
  for (let page = 0; page < 100; page += 1) {
    const result = await stripeRequest('/checkout/sessions', {
      params: { limit: 100, ...params, starting_after: startingAfter || undefined }
    });
    const data = Array.isArray(result?.data) ? result.data : [];
    all.push(...data);
    if (!result?.has_more || data.length === 0) break;
    startingAfter = data[data.length - 1].id;
  }
  return all;
}

export async function findSessionByPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  const result = await stripeRequest('/checkout/sessions', {
    params: { limit: 10, payment_intent: paymentIntentId }
  });
  return Array.isArray(result?.data) ? result.data[0] || null : null;
}

export function commissionFor(amount, rate) {
  const base = Math.max(0, Number(amount || 0));
  const pct = Math.max(0, Math.min(100, Number(rate || 0)));
  return Math.round(base * pct / 100);
}

export function holdUntilEpoch(createdSeconds) {
  const created = Number(createdSeconds || Math.floor(Date.now() / 1000));
  return created + HOLD_DAYS * 24 * 60 * 60;
}

export async function paystackRequest(path, { method = 'GET', body } = {}) {
  const secret = env('PAYSTACK_SECRET_KEY');
  if (!secret) {
    const error = new Error('Paystack secret key is not configured.');
    error.code = 'PAYSTACK_NOT_CONFIGURED';
    throw error;
  }
  const response = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let result = {};
  try { result = await response.json(); } catch {}
  if (!response.ok || result?.status === false) {
    const error = new Error(result?.message || `Paystack request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function findPaystackRecipient(referralId) {
  const ref = normalizeRef(referralId);
  if (!ref) return null;
  for (let page = 1; page <= 20; page += 1) {
    const result = await paystackRequest(`/transferrecipient?perPage=50&page=${page}`);
    const recipients = Array.isArray(result?.data) ? result.data : [];
    const match = recipients.find((recipient) =>
      normalizeRef(recipient?.metadata?.referralId) === ref && recipient?.active !== false
    );
    if (match) return match;
    if (recipients.length < 50) break;
  }
  return null;
}

export function payoutReference(sessionId, referralId) {
  const cleanSession = String(sessionId || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(-20);
  const cleanRef = String(referralId || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(-16);
  return `tdb_${cleanRef}_${cleanSession}`.slice(0, 50).padEnd(16, '0');
}
