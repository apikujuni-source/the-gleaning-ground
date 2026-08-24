import { readFile, writeFile } from 'node:fs/promises';

const files = [
  '_site/divine-blueprint-site/index.html',
  '_site/divine-blueprint-site/ambassadors/index.html',
  '_site/divine-blueprint-site/ambassadors/terms/index.html'
];

for (const file of files) {
  let html = await readFile(file, 'utf8');
  html = html
    .replace(/15\s*%/g, '25%')
    .replace(/15(?:&#37;|&percnt;)/gi, '25%');
  await writeFile(file, html, 'utf8');
}

const ambassador = await readFile('_site/divine-blueprint-site/ambassadors/index.html', 'utf8');
const terms = await readFile('_site/divine-blueprint-site/ambassadors/terms/index.html', 'utf8');

if (/15\s*%|15(?:&#37;|&percnt;)/i.test(ambassador + terms)) {
  throw new Error('Legacy 15% ambassador commission copy remains after enforcement.');
}
if (!ambassador.includes('25%') || !terms.includes('25%')) {
  throw new Error('25% ambassador commission copy was not found on the final ambassador pages.');
}

console.log('Enforced 25% Divine Blueprint ambassador commission on final public pages.');
