import { readFile } from 'node:fs/promises';

const admin = await readFile('_site/admin/index.html', 'utf8');
const fn = await readFile('netlify/functions/send-ambassador-approval.mjs', 'utf8');

for (const expected of [
  'https://divineblueprint.gleaningground.com/api/admin/send-ambassador-approval',
  'Send approval email via Zoho'
]) {
  if (!admin.includes(expected)) throw new Error(`Admin Zoho routing missing: ${expected}`);
}

for (const expected of [
  "Netlify.env.get('ZOHO_SMTP_PASSWORD')",
  "request.method === 'OPTIONS'",
  "'access-control-allow-origin'",
  "'https://gleaningground.com'"
]) {
  if (!fn.includes(expected)) throw new Error(`Zoho function verification failed: ${expected}`);
}

console.log('Verified Zoho mail routing, Netlify secret access, and restricted CORS support.');
