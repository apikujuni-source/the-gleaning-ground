import { createHash } from 'node:crypto';
import { json } from '../lib/affiliate-core.mjs';
import { BODY_MAX, NAME_MAX, TITLE_MAX, clean, db, normalizePostPath, toPublic } from '../lib/post-comments.mjs';

const COOLDOWN_SECONDS = 20;
const HOURLY_LIMIT = 10;

function hashIp(ip) {
  if (!ip) return null;
  return createHash('sha256').update(`gleaning-ground-comments:${ip}`).digest('hex');
}

async function listComments(path) {
  const rows = await db().sql`
    SELECT id, author_name, body, created_at
    FROM post_comments
    WHERE post_path = ${path}
    ORDER BY created_at ASC, id ASC
    LIMIT 500
  `;
  return rows.map(toPublic);
}

export default async (request, context) => {
  if (request.method === 'GET') {
    const path = normalizePostPath(new URL(request.url).searchParams.get('post'));
    if (!path) return json(400, { ok: false, error: 'INVALID_POST' });
    return json(200, { ok: true, comments: await listComments(path) });
  }

  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  let payload = {};
  try { payload = await request.json(); } catch { return json(400, { ok: false, error: 'INVALID_JSON' }); }

  // Hidden honeypot field: real visitors never fill it in.
  if (clean(payload?.website, 200)) return json(201, { ok: true, comment: null });

  const path = normalizePostPath(payload?.post);
  const name = clean(payload?.name, NAME_MAX);
  const body = clean(payload?.body, BODY_MAX, { multiline: true });
  const title = clean(payload?.title, TITLE_MAX);
  if (!path) return json(400, { ok: false, error: 'INVALID_POST', message: 'This page cannot receive comments.' });
  if (name.length < 2) return json(400, { ok: false, error: 'NAME_REQUIRED', message: 'Please enter your name.' });
  if (body.length < 2) return json(400, { ok: false, error: 'COMMENT_REQUIRED', message: 'Please write a comment.' });

  const ipHash = hashIp(context?.ip);
  if (ipHash) {
    const [recent] = await db().sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - make_interval(secs => ${COOLDOWN_SECONDS}))::int AS last_moments,
        COUNT(*)::int AS last_hour
      FROM post_comments
      WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (recent?.last_moments > 0 || recent?.last_hour >= HOURLY_LIMIT) {
      return json(429, { ok: false, error: 'RATE_LIMITED', message: 'You are commenting a little too quickly. Please wait a moment and try again.' });
    }
  }

  const [row] = await db().sql`
    INSERT INTO post_comments (post_path, post_title, author_name, body, ip_hash)
    VALUES (${path}, ${title}, ${name}, ${body}, ${ipHash})
    RETURNING id, author_name, body, created_at
  `;
  return json(201, { ok: true, comment: toPublic(row) });
};

export const config = { path: '/api/comments' };
