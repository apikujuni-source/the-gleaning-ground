import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const files = [
  path.join(siteDir, 'index.html'),
  path.join(siteDir, 'ambassadors', 'index.html'),
  path.join(siteDir, 'church-partners', 'index.html'),
  path.join(siteDir, 'give-a-copy', 'index.html')
];

const expectedHeader = [
  ['Link — Give a Copy', '/html/body/header/div/nav/a[4]', '/give-a-copy']
];
const forbiddenHeader = ['Link — Ambassadors', 'Link — Church Partners', 'Link — Partner With Us'];
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

function getSection(page, filePath, sectionLabel) {
  const section = page.sections?.find((item) => item.label === sectionLabel);
  if (!section) throw new Error(`${filePath}: ${sectionLabel} CMS section missing`);
  return section;
}

function validateFields(page, filePath, sectionLabel, expected) {
  const section = getSection(page, filePath, sectionLabel);
  for (const [label, xpath, url] of expected) {
    const matches = (section.linkFields || []).filter((item) => item.label === label);
    if (matches.length !== 1) throw new Error(`${filePath}: expected one ${label}, found ${matches.length}`);
    const item = matches[0];
    if (item.xpath !== xpath || item.url !== url || item.text !== label.replace('Link — ', '')) {
      throw new Error(`${filePath}: ${label} runtime selector/content is stale`);
    }
  }
}

function validateForbiddenHeaderFields(page, filePath) {
  const header = getSection(page, filePath, 'Header & navigation');
  for (const label of forbiddenHeader) {
    const count = (header.linkFields || []).filter((item) => item.label === label).length;
    if (count !== 0) throw new Error(`${filePath}: stale header runtime field remains: ${label}`);
  }
}

function validateStaticNav(html, filePath) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const partnerMenus = nav.match(/data-partner-menu/gi) || [];
  if (partnerMenus.length !== 1) throw new Error(`${filePath}: expected one Partner With Us dropdown, found ${partnerMenus.length}`);

  const partnerBlock = nav.match(/<div\b[^>]*data-partner-menu[^>]*>[\s\S]*?<\/div>\s*<\/div>/i)?.[0] || '';
  if (!/Partner With Us/i.test(partnerBlock)) throw new Error(`${filePath}: Partner With Us label missing`);

  const anchors = [...partnerBlock.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => [match[1].replace(/\/+$/, ''), match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()]);

  if (anchors.filter(([href, text]) => href === '/ambassadors' && text === 'Become an Ambassador').length !== 1) {
    throw new Error(`${filePath}: expected one Become an Ambassador dropdown item`);
  }
  if (anchors.filter(([href, text]) => href === '/church-partners' && text === 'Church Partners').length !== 1) {
    throw new Error(`${filePath}: expected one Church Partners dropdown item`);
  }

  const allNavAnchors = [...nav.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => [match[1].replace(/\/+$/, ''), match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()]);
  if (allNavAnchors.filter(([href, text]) => href === '/give-a-copy' && text === 'Give a Copy').length !== 1) {
    throw new Error(`${filePath}: expected exactly one Give a Copy top-level link`);
  }
}

for (const filePath of files) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing validation page: ${filePath}`);
  const html = fs.readFileSync(filePath, 'utf8');
  const page = extractPageData(html, filePath);
  validateFields(page, filePath, 'Header & navigation', expectedHeader);
  validateForbiddenHeaderFields(page, filePath);
  validateFields(page, filePath, 'Footer', expectedFooter);
  validateStaticNav(html, filePath);
}

console.log('Validated Partner With Us dropdown, Give a Copy runtime selector, footer selectors, and canonical static links.');
