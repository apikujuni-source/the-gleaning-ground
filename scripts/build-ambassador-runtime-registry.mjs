import { promises as fs } from 'node:fs';
import path from 'node:path';

const sourceDir = path.resolve('content/divine-blueprint/approved-ambassadors');
const outputFile = path.resolve('netlify/functions/_ambassador-registry.generated.mjs');

const normalizeRef = (value) => {
  const ref = String(value || '').trim().toUpperCase();
  return /^AMB-[A-Z0-9_-]{2,60}$/.test(ref) ? ref : '';
};

const normalizeEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : '';
};

const cleanName = (value) => String(value || '').trim().slice(0, 160);

async function main() {
  let names = [];
  try {
    names = await fs.readdir(sourceDir);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const records = [];
  for (const name of names.filter((item) => item.endsWith('.json')).sort()) {
    const slug = name.slice(0, -5).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) continue;
    try {
      const raw = await fs.readFile(path.join(sourceDir, name), 'utf8');
      const record = JSON.parse(raw);
      const referralId = normalizeRef(record?.referralId);
      const email = normalizeEmail(record?.email);
      if (!referralId || !email) continue;
      const commissionRate = Number.isFinite(Number(record?.commissionRate))
        ? Math.max(0, Math.min(100, Number(record.commissionRate)))
        : 25;
      records.push({
        slug,
        ambassadorName: cleanName(record?.ambassadorName),
        email,
        referralId,
        status: String(record?.status || '').trim(),
        commissionRate
      });
    } catch (error) {
      console.warn(`Skipping invalid ambassador record ${name}: ${error.message}`);
    }
  }

  const output = `// Generated at build time for server-side functions only. Contains only fields required by the affiliate runtime; phone, location, notes, and application data are excluded.\nexport default ${JSON.stringify(records, null, 2)};\n`;
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, output, 'utf8');
  console.log(`Built private-safe ambassador runtime registry with ${records.length} record(s).`);
}

await main();
