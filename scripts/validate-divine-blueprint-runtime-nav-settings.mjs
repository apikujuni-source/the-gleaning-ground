import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const files = [
  path.join(siteDir, 'index.html'),
  path.join(siteDir, 'ambassadors', 'index.html'),
  path.join(siteDir, 'give-a-copy', 'index.html')
];

const expectedHeader = [
  ['Link — Ambassadors', '/html/body/header/div/nav/a[4]', '/ambassadors'],
  ['Link — Church Partners', '/html/body/header/div/nav/a[5]', '/church-partners'],
  ['Link — Give a Copy', '/html/body/header/div/nav/a[6]', '/give-a-copy']
];
const expectedFooter = [
  ['Link — Ambassadors', '/html/body/footer/div/div[1]/div[4]/a[4]', '/ambassadors'],
  ['Link — Church Partners', '/html/body/footer/div/div[1]/div[4]/a[5]', '/church-partners'],
  ['Link — Give a Copy', '/html/body/footer/div/div[1]/div[4]/a[6]', '/give-a-copy']
];

function extractPageData(html, filePath) {
  const match = html.match(/<script id="cms-page-data" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) throw new Error(`${filePath}: cms-page-data block missing`);
  return JSON.parse(match[1]);
}

function validateFields(page, filePath, sectionLabel, expected) {
  const section = page.sections?.find((item) => item.label === sectionLabel);
  if (!section) throw new Error(`${filePath}: ${sectionLabel} CMS section missing`);
  for (const [label, xpath, url] of expected) {
    const matches = (section.linkFields || []).filter((item) => item.label === label);
    if (matches.length !== 1) throw new Error(`${filePath}: expected one ${label}, found ${matches.length}`);
    const item = matches[0];
    if (item.xpath !== xpath || item.url !== url || item.text !== label.replace('Link — ', '')) {
      throw new Error(`${filePath}: ${label} runtime selector/content is stale`);
    }
  }
}

function validateStaticNav(html, filePath) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  for (const [label, href] of [['Ambassadors', '/ambassadors'], ['Give a Copy', '/give-a-copy']]) {
    const anchors = [...nav.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .filter((match) => match[1].replace(/\/+$/, '') === href && match[2].replace(/<[^>]+>/g, '').trim() === label);
    if (anchors.length !== 1) throw new Error(`${filePath}: expected one static ${label} link, found ${anchors.length}`);
  }
}

for (const filePath of files) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing validation page: ${filePath}`);
  const html = fs.readFileSync(filePath, 'utf8');
  const page = extractPageData(html, filePath);
  validateFields(page, filePath, 'Header & navigation', expectedHeader);
  validateFields(page, filePath, 'Footer', expectedFooter);
  validateStaticNav(html, filePath);
}

console.log('Validated Divine Blueprint runtime navigation selectors and canonical static links.');
