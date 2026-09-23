import { json, verifyGithubAdmin } from '../lib/affiliate-core.mjs';
import { db, toPublic } from '../lib/post-comments.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const authorization = String(request.headers.get('authorization') || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!(await verifyGithubAdmin(token))) return json(403, { ok: false, error: 'ADMIN_REQUIRED' });

  let payload = {};
  try { payload = await request.json(); } catch { return json(400, { ok: false, error: 'INVALID_JSON' }); }
  const action = String(payload?.action || 'list').toLowerCase();

  if (action === 'list') {
    const rows = await db().sql`
      SELECT id, post_path, post_title, author_name, body, created_at
      FROM post_comments
      ORDER BY created_at DESC, id DESC
      LIMIT 300
    `;
    const comments = rows.map((row) => ({ ...toPublic(row), postPath: row.post_path, postTitle: row.post_title }));
    return json(200, { ok: true, comments });
  }

  if (action === 'delete') {
    const id = Number.parseInt(payload?.id, 10);
    if (!Number.isSafeInteger(id) || id < 1) return json(400, { ok: false, error: 'INVALID_ID' });
    const deleted = await db().sql`DELETE FROM post_comments WHERE id = ${id} RETURNING id`;
    if (!deleted.length) return json(404, { ok: false, error: 'COMMENT_NOT_FOUND' });
    return json(200, { ok: true, id });
  }

  return json(400, { ok: false, error: 'INVALID_ACTION' });
};

export const config = { path: '/api/admin/post-comments' };
