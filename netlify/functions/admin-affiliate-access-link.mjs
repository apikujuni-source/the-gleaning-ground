import {
  json,
  verifyGithubAdmin,
  findAmbassadorBySlug,
  signAffiliateToken
} from './_affiliate-core.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const authorization = String(request.headers.get('authorization') || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!(await verifyGithubAdmin(token))) return json(403, { ok: false, error: 'ADMIN_REQUIRED' });

  let payload = {};
  try { payload = await request.json(); } catch { return json(400, { ok: false, error: 'INVALID_JSON' }); }
  const ambassador = await findAmbassadorBySlug(payload?.slug);
  if (!ambassador) return json(404, { ok: false, error: 'AMBASSADOR_NOT_FOUND' });

  const accessToken = signAffiliateToken({
    referralId: ambassador.referralId,
    email: ambassador.email,
    days: 30
  });
  const origin = new URL(request.url).origin;
  return json(200, {
    ok: true,
    ambassadorName: ambassador.ambassadorName,
    referralId: ambassador.referralId,
    dashboardUrl: `${origin}/api/affiliate/dashboard?token=${encodeURIComponent(accessToken)}`,
    payoutSetupUrl: `${origin}/api/affiliate/payout-setup?token=${encodeURIComponent(accessToken)}`,
    expiresInDays: 30
  });
};

export const config = { path: '/api/admin/affiliate-access-link' };
