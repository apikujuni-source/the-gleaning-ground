import tls from 'node:tls';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const ADMIN_GITHUB_LOGIN = 'apikujuni-source';
const FROM_EMAIL = 'info@gleaningground.com';
const CC_EMAIL = 'apikujuni@gmail.com';
const DEFAULT_SMTP_HOST = 'smtppro.zoho.com';
const DEFAULT_SMTP_PORT = 465;
const ALLOWED_ORIGINS = new Set([
  'https://gleaningground.com',
  'https://www.gleaningground.com'
]);

const recentSends = new Map();

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
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

async function verifyGithubAdmin(token) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'the-gleaning-ground-netlify-function',
      'x-github-api-version': '2022-11-28'
    }
  });
  if (!response.ok) return false;
  const profile = await response.json();
  return String(profile?.login || '').toLowerCase() === ADMIN_GITHUB_LOGIN.toLowerCase();
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
    `Cc: <${CC_EMAIL}>`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@gleaningground.com>`,
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

async function sendViaZoho({ to, referralLink }) {
  const user = String(process.env.ZOHO_SMTP_USER || FROM_EMAIL).trim();
  const password = String(process.env.ZOHO_SMTP_PASSWORD || '').trim();
  const host = String(process.env.ZOHO_SMTP_HOST || DEFAULT_SMTP_HOST).trim();
  const port = Number(process.env.ZOHO_SMTP_PORT || DEFAULT_SMTP_PORT);

  if (!password) {
    const error = new Error('Zoho SMTP password is not configured.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }
  if (!user || !host || !Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('Zoho SMTP configuration is incomplete.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  const socket = tls.connect({
    host,
    port,
    servername: host,
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
    await command(Buffer.from(user).toString('base64'), [334]);
    await command(Buffer.from(password).toString('base64'), [235]);
    await command(`MAIL FROM:<${FROM_EMAIL}>`, [250]);
    await command(`RCPT TO:<${to}>`, [250, 251]);
    await command(`RCPT TO:<${CC_EMAIL}>`, [250, 251]);
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

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { ok: false, error: 'ORIGIN_NOT_ALLOWED' });
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

  const email = normalizeEmail(payload?.email);
  const referralLink = normalizeReferralLink(payload?.referralLink);
  if (!email || !referralLink) {
    return json(400, { ok: false, error: 'INVALID_AMBASSADOR_DATA' });
  }

  const now = Date.now();
  const lastSend = recentSends.get(email) || 0;
  if (now - lastSend < 60000) {
    return json(429, { ok: false, error: 'RECENTLY_SENT' });
  }

  try {
    await sendViaZoho({ to: email, referralLink });
    recentSends.set(email, now);
    return json(200, {
      ok: true,
      from: FROM_EMAIL,
      cc: CC_EMAIL,
      to: email
    });
  } catch (error) {
    if (error?.code === 'MAIL_NOT_CONFIGURED') {
      console.error('Zoho mail is not configured', error.message);
      return json(503, { ok: false, error: 'MAIL_NOT_CONFIGURED' });
    }
    console.error('Zoho ambassador approval email failed', error);
    return json(502, { ok: false, error: 'MAIL_SEND_FAILED' });
  }
};

export const config = {
  path: '/api/admin/send-ambassador-approval'
};
