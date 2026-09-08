import tls from 'node:tls';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const ADMIN_GITHUB_LOGIN = 'apikujuni-source';
const REPO = 'apikujuni-source/the-gleaning-ground';
const AMBASSADOR_FOLDER = 'content/divine-blueprint/approved-ambassadors';
const FROM_EMAIL = 'apikujuni@gmail.com';
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function normalizeSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) ? slug : '';
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return '';
  return email;
}

function normalizeReferralLink(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== 'divineblueprint.gleaningground.com') return '';
    if (url.pathname !== '/' && url.pathname !== '') return '';
    const ref = String(url.searchParams.get('ref') || '').trim().toUpperCase();
    if (!/^AMB-[A-Z0-9_-]{2,60}$/.test(ref)) return '';
    return `https://divineblueprint.gleaningground.com/?ref=${encodeURIComponent(ref)}`;
  } catch {
    return '';
  }
}

async function githubRequest(url, token, accept = 'application/vnd.github+json') {
  return fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept,
      'user-agent': 'the-gleaning-ground-netlify-function',
      'x-github-api-version': '2022-11-28'
    }
  });
}

async function verifyGithubAdmin(token) {
  const response = await githubRequest('https://api.github.com/user', token);
  if (!response.ok) return false;
  const profile = await response.json();
  return String(profile?.login || '').toLowerCase() === ADMIN_GITHUB_LOGIN.toLowerCase();
}

async function loadPublishedAmbassador(slug, token) {
  const url = `https://api.github.com/repos/${REPO}/contents/${AMBASSADOR_FOLDER}/${encodeURIComponent(slug)}.json?ref=main`;
  const response = await githubRequest(url, token, 'application/vnd.github.raw+json');

  if (response.status === 404) {
    const error = new Error('Ambassador entry is not published on main.');
    error.code = 'AMBASSADOR_NOT_PUBLISHED';
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`Could not load published ambassador record (${response.status}).`);
    error.code = 'AMBASSADOR_LOOKUP_FAILED';
    throw error;
  }

  let record;
  try {
    record = JSON.parse(await response.text());
  } catch {
    const error = new Error('Published ambassador record is invalid JSON.');
    error.code = 'AMBASSADOR_RECORD_INVALID';
    throw error;
  }

  if (String(record?.status || '').trim() !== 'Active') {
    const error = new Error('Ambassador is not active.');
    error.code = 'AMBASSADOR_NOT_ACTIVE';
    throw error;
  }

  const email = normalizeEmail(record?.email);
  const referralLink = normalizeReferralLink(record?.referralLink);
  if (!email || !referralLink) {
    const error = new Error('Published ambassador record is missing a valid email or referral link.');
    error.code = 'AMBASSADOR_RECORD_INVALID';
    throw error;
  }

  return {
    email,
    referralLink,
    ambassadorName: String(record?.ambassadorName || '').trim()
  };
}

function buildMessage({ to, referralLink }) {
  const subject = 'Welcome to the Divine Blueprint Ambassador Program';
  const body = [
    'Congratulations! Your application to become a Divine Blueprint Ambassador has been approved.',
    '',
    'We’re excited to have you join us in helping share the message of The Divine Blueprint.',
    '',
    'Your personal referral link:',
    referralLink,
    '',
    'Your Ambassador Toolkit will be sent to you shortly.',
    '',
    'Welcome to the Ambassador Program!'
  ].join('\r\n');

  const headers = [
    `From: The Gleaning Ground <${FROM_EMAIL}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@gmail.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit'
  ].join('\r\n');

  const dotStuffedBody = body
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');

  return `${headers}\r\n\r\n${dotStuffedBody}`;
}

async function sendViaGmail({ to, referralLink }) {
  const password = String(Netlify.env.get('GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '').trim();
  if (!password) {
    const error = new Error('Gmail app password is not configured.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  const socket = tls.connect({
    host: SMTP_HOST,
    port: SMTP_PORT,
    servername: SMTP_HOST,
    rejectUnauthorized: true
  });
  socket.setTimeout(20000);
  socket.on('timeout', () => socket.destroy(new Error('SMTP connection timed out.')));

  await once(socket, 'secureConnect');
  const lines = createInterface({ input: socket, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();

  async function readReply() {
    const collected = [];
    while (true) {
      const { value, done } = await iterator.next();
      if (done) throw new Error('SMTP connection closed unexpectedly.');
      const line = String(value || '');
      collected.push(line);
      if (/^\d{3} /.test(line)) {
        return { code: Number(line.slice(0, 3)), text: collected.join('\n') };
      }
    }
  }

  async function command(commandText, expectedCodes) {
    socket.write(`${commandText}\r\n`);
    const reply = await readReply();
    if (!expectedCodes.includes(reply.code)) {
      throw new Error(`SMTP command failed with ${reply.code}: ${reply.text}`);
    }
    return reply;
  }

  try {
    const greeting = await readReply();
    if (greeting.code !== 220) throw new Error(`SMTP greeting failed: ${greeting.text}`);

    await command('EHLO gleaningground.com', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(FROM_EMAIL).toString('base64'), [334]);
    await command(Buffer.from(password).toString('base64'), [235]);
    await command(`MAIL FROM:<${FROM_EMAIL}>`, [250]);
    await command(`RCPT TO:<${to}>`, [250, 251]);
    await command('DATA', [354]);

    socket.write(`${buildMessage({ to, referralLink })}\r\n.\r\n`);
    const dataReply = await readReply();
    if (dataReply.code !== 250) throw new Error(`SMTP DATA failed: ${dataReply.text}`);

    await command('QUIT', [221]);
  } finally {
    lines.close();
    if (!socket.destroyed) socket.end();
  }
}

function ambassadorErrorResponse(error) {
  const code = error?.code;
  if (code === 'AMBASSADOR_NOT_PUBLISHED') return json(404, { ok: false, error: code });
  if (code === 'AMBASSADOR_NOT_ACTIVE') return json(409, { ok: false, error: code });
  if (code === 'AMBASSADOR_RECORD_INVALID') return json(422, { ok: false, error: code });
  if (code === 'AMBASSADOR_LOOKUP_FAILED') return json(502, { ok: false, error: code });
  return null;
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const authorization = String(request.headers.get('authorization') || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return json(401, { ok: false, error: 'AUTH_REQUIRED' });

  let isAdmin = false;
  try {
    isAdmin = await verifyGithubAdmin(token);
  } catch (error) {
    console.error('GitHub admin verification failed', error);
  }
  if (!isAdmin) return json(403, { ok: false, error: 'ADMIN_REQUIRED' });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'INVALID_JSON' });
  }

  const slug = normalizeSlug(payload?.slug);
  if (!slug) return json(400, { ok: false, error: 'INVALID_AMBASSADOR_SLUG' });

  let ambassador;
  try {
    ambassador = await loadPublishedAmbassador(slug, token);
  } catch (error) {
    console.error('Published ambassador lookup failed', error);
    return ambassadorErrorResponse(error) || json(502, { ok: false, error: 'AMBASSADOR_LOOKUP_FAILED' });
  }

  if (payload?.preview === true) {
    return json(200, {
      ok: true,
      preview: true,
      from: FROM_EMAIL,
      to: ambassador.email,
      ambassadorName: ambassador.ambassadorName,
      referralLink: ambassador.referralLink
    });
  }

  try {
    await sendViaGmail({ to: ambassador.email, referralLink: ambassador.referralLink });
    return json(200, { ok: true, from: FROM_EMAIL, to: ambassador.email });
  } catch (error) {
    if (error?.code === 'MAIL_NOT_CONFIGURED') {
      console.error('Gmail mail is not configured', error.message);
      return json(503, { ok: false, error: 'MAIL_NOT_CONFIGURED' });
    }
    console.error('Gmail ambassador approval email failed', error);
    return json(502, { ok: false, error: 'MAIL_SEND_FAILED' });
  }
};

export const config = {
  path: '/api/admin/send-ambassador-gmail'
};
