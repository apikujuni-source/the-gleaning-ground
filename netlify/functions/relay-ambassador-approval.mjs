const UPSTREAM_ENDPOINT = 'https://divineblueprint.gleaningground.com/api/admin/send-ambassador-approval';
const ALLOWED_ORIGINS = new Set([
  'https://gleaningground.com',
  'https://www.gleaningground.com'
]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { ok: false, error: 'ORIGIN_NOT_ALLOWED' });
  }

  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const authorization = String(request.headers.get('authorization') || '').trim();
  if (!authorization.startsWith('Bearer ')) {
    return json(401, { ok: false, error: 'AUTH_REQUIRED' });
  }

  let body;
  try {
    body = await request.text();
  } catch {
    return json(400, { ok: false, error: 'INVALID_BODY' });
  }

  if (!body || body.length > 20000) {
    return json(400, { ok: false, error: 'INVALID_BODY' });
  }

  try {
    const upstream = await fetch(UPSTREAM_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization
      },
      body,
      redirect: 'error'
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Ambassador approval relay failed', error);
    return json(502, { ok: false, error: 'RELAY_FAILED' });
  }
};

export const config = {
  path: '/api/admin/relay-ambassador-approval'
};
