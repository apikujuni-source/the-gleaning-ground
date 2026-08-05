import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');

if (!fs.existsSync(siteDir)) {
  throw new Error(`Divine Blueprint site directory not found: ${siteDir}`);
}

const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
const textOf = (anchor) => anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hrefOf = (anchor) => anchor.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
const isPartnerAnchor = (anchor) => {
  const href = hrefOf(anchor).replace(/\/+$/, '');
  return href === '/church-partners' || /church partners/i.test(textOf(anchor));
};

function normalizeHeader(html, isPartnerPage) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;

  return html.replace(navPattern, (_match, open, body, close) => {
    const anchors = body.match(anchorPattern) || [];
    const existingPartner = anchors.find(isPartnerAnchor);
    const current = isPartnerPage || /aria-current=["']page["']/i.test(existingPartner || '');

    // Remove every existing Church Partners item first so its position is deterministic.
    body = body.replace(anchorPattern, (anchor) => isPartnerAnchor(anchor) ? '' : anchor);

    const partner = `<a href="/church-partners"${current ? ' aria-current="page"' : ''}>Church Partners</a>`;
    const aboutPattern = /(<a\b[^>]*>\s*About\s*<\/a>)/i;

    if (aboutPattern.test(body)) {
      body = body.replace(aboutPattern, `$1\n${partner}`);
    } else {
      body = `${body}\n${partner}`;
    }

    return `${open}${body}${close}`;
  });
}

function normalizeFooter(html) {
  const connectPattern = /(<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>)([\s\S]*?)(<\/div>)/i;

  return html.replace(connectPattern, (_match, open, body, close) => {
    // Remove an existing partner link and one adjacent line break.
    body = body
      .replace(/\s*<br\s*\/?>\s*(<a\b[^>]*>[\s\S]*?<\/a>)/gi, (match, anchor) => isPartnerAnchor(anchor) ? '' : match)
      .replace(/(<a\b[^>]*>[\s\S]*?<\/a>)\s*<br\s*\/?>/gi, (match, anchor) => isPartnerAnchor(anchor) ? '' : match)
      .replace(anchorPattern, (anchor) => isPartnerAnchor(anchor) ? '' : anchor);

    const partner = '<a href="/church-partners" data-church-partner-footer-link>Church Partners</a>';
    const gleaningPattern = /(<a\b[^>]*>\s*Gleaning Ground\s*<\/a>)/i;

    if (gleaningPattern.test(body)) {
      body = body.replace(gleaningPattern, `$1<br>${partner}`);
    } else {
      body = `${body}<br>${partner}`;
    }

    return `${open}${body}${close}`;
  });
}

function validate(filePath, html) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const navAnchors = nav.match(anchorPattern) || [];
  const aboutIndexes = navAnchors
    .map((anchor, index) => /^About$/i.test(textOf(anchor)) ? index : -1)
    .filter((index) => index >= 0);
  const partnerIndexes = navAnchors
    .map((anchor, index) => hrefOf(anchor).replace(/\/+$/, '') === '/church-partners' ? index : -1)
    .filter((index) => index >= 0);

  if (aboutIndexes.length !== 1) {
    throw new Error(`${filePath}: expected exactly one About link, found ${aboutIndexes.length}`);
  }
  if (partnerIndexes.length !== 1) {
    throw new Error(`${filePath}: expected exactly one Church Partners link, found ${partnerIndexes.length}`);
  }
  if (partnerIndexes[0] <= aboutIndexes[0]) {
    throw new Error(`${filePath}: Church Partners must follow About so CMS positional selectors remain stable`);
  }

  const connect = html.match(/<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>([\s\S]*?)<\/div>/i)?.[1] || '';
  const footerAnchors = connect.match(anchorPattern) || [];
  const gleaningIndex = footerAnchors.findIndex((anchor) => /^Gleaning Ground$/i.test(textOf(anchor)));
  const footerPartnerIndexes = footerAnchors
    .map((anchor, index) => hrefOf(anchor).replace(/\/+$/, '') === '/church-partners' ? index : -1)
    .filter((index) => index >= 0);

  if (footerPartnerIndexes.length !== 1) {
    throw new Error(`${filePath}: expected exactly one Church Partners footer link, found ${footerPartnerIndexes.length}`);
  }
  if (gleaningIndex >= 0 && footerPartnerIndexes[0] <= gleaningIndex) {
    throw new Error(`${filePath}: Church Partners footer link must follow Gleaning Ground`);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    let html = fs.readFileSync(fullPath, 'utf8');
    const isPartnerPage = /(?:^|\/)church-partners(?:\/index)?\.html$/i.test(fullPath);
    html = normalizeHeader(html, isPartnerPage);
    html = normalizeFooter(html);
    validate(fullPath, html);
    fs.writeFileSync(fullPath, html);
  }
}

walk(siteDir);
console.log('Divine Blueprint navigation order stabilized for CMS runtime selectors.');
