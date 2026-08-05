import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');

if (!fs.existsSync(siteDir)) {
  throw new Error(`Divine Blueprint site directory not found: ${siteDir}`);
}

const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
const textOf = (anchor) => anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hrefOf = (anchor) => anchor.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
const cleanHref = (href) => {
  let value = String(href || '').trim().replace(/^https?:\/\/[^/]+/i, '');
  value = value.replace(/[?#].*$/, '').replace(/index\.html$/i, '').replace(/\.html$/i, '');
  value = value.replace(/\/+$/, '');
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value.replace(/^(?:\.\.\/|\.\/)+/, '')}`;
};
const isPartnerAnchor = (anchor) => cleanHref(hrefOf(anchor)) === '/church-partners' || /^Church Partners$/i.test(textOf(anchor));
const isGiveAnchor = (anchor) => cleanHref(hrefOf(anchor)) === '/give-a-copy' || /^(Give a Copy|Sponsor Copies)$/i.test(textOf(anchor));

function removeAnchorAndAdjacentBreaks(body, predicate) {
  return body
    .replace(/\s*<br\s*\/?>\s*(<a\b[^>]*>[\s\S]*?<\/a>)/gi, (match, anchor) => predicate(anchor) ? '' : match)
    .replace(/(<a\b[^>]*>[\s\S]*?<\/a>)\s*<br\s*\/?>/gi, (match, anchor) => predicate(anchor) ? '' : match)
    .replace(anchorPattern, (anchor) => predicate(anchor) ? '' : anchor);
}

function normalizeHeader(html, isPartnerPage, isGivePage) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;

  return html.replace(navPattern, (_match, open, body, close) => {
    body = body.replace(anchorPattern, (anchor) => (isPartnerAnchor(anchor) || isGiveAnchor(anchor)) ? '' : anchor);

    const partner = `<a href="/church-partners"${isPartnerPage ? ' aria-current="page"' : ''}>Church Partners</a>`;
    const give = `<a href="/give-a-copy"${isGivePage ? ' aria-current="page"' : ''}>Give a Copy</a>`;
    const aboutPattern = /(<a\b[^>]*>\s*About\s*<\/a>)/i;

    if (aboutPattern.test(body)) {
      body = body.replace(aboutPattern, `$1\n${partner}\n${give}`);
    } else {
      body = `${body}\n${partner}\n${give}`;
    }

    return `${open}${body}${close}`;
  });
}

function normalizeFooter(html) {
  const connectPattern = /(<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>)([\s\S]*?)(<\/div>)/i;

  return html.replace(connectPattern, (_match, open, body, close) => {
    body = removeAnchorAndAdjacentBreaks(body, (anchor) => isPartnerAnchor(anchor) || isGiveAnchor(anchor));

    const partner = '<a href="/church-partners" data-church-partner-footer-link>Church Partners</a>';
    const give = '<a href="/give-a-copy" data-give-a-copy-footer-link>Give a Copy</a>';
    const gleaningPattern = /(<a\b[^>]*>\s*Gleaning Ground\s*<\/a>)/i;

    if (gleaningPattern.test(body)) {
      body = body.replace(gleaningPattern, `$1<br>${partner}<br>${give}`);
    } else {
      body = `${body}<br>${partner}<br>${give}`;
    }

    return `${open}${body}${close}`;
  });
}

function validate(filePath, html) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const navAnchors = nav.match(anchorPattern) || [];
  const indexes = {
    about: navAnchors.map((a, i) => /^About$/i.test(textOf(a)) ? i : -1).filter((i) => i >= 0),
    partner: navAnchors.map((a, i) => cleanHref(hrefOf(a)) === '/church-partners' ? i : -1).filter((i) => i >= 0),
    give: navAnchors.map((a, i) => cleanHref(hrefOf(a)) === '/give-a-copy' ? i : -1).filter((i) => i >= 0)
  };

  for (const [name, values] of Object.entries(indexes)) {
    if (values.length !== 1) throw new Error(`${filePath}: expected exactly one ${name} navigation link, found ${values.length}`);
  }
  if (!(indexes.about[0] < indexes.partner[0] && indexes.partner[0] < indexes.give[0])) {
    throw new Error(`${filePath}: CMS-safe header order must be About, Church Partners, Give a Copy`);
  }

  const connect = html.match(/<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>([\s\S]*?)<\/div>/i)?.[1] || '';
  const footerAnchors = connect.match(anchorPattern) || [];
  const footerIndexes = {
    gleaning: footerAnchors.findIndex((anchor) => /^Gleaning Ground$/i.test(textOf(anchor))),
    partner: footerAnchors.map((a, i) => cleanHref(hrefOf(a)) === '/church-partners' ? i : -1).filter((i) => i >= 0),
    give: footerAnchors.map((a, i) => cleanHref(hrefOf(a)) === '/give-a-copy' ? i : -1).filter((i) => i >= 0)
  };
  if (footerIndexes.partner.length !== 1 || footerIndexes.give.length !== 1) {
    throw new Error(`${filePath}: expected one Church Partners and one Give a Copy footer link`);
  }
  if (footerIndexes.gleaning >= 0 && !(footerIndexes.gleaning < footerIndexes.partner[0] && footerIndexes.partner[0] < footerIndexes.give[0])) {
    throw new Error(`${filePath}: CMS-safe footer order must be Gleaning Ground, Church Partners, Give a Copy`);
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
    const isGivePage = /(?:^|\/)give-a-copy(?:\/index)?\.html$/i.test(fullPath);
    html = normalizeHeader(html, isPartnerPage, isGivePage);
    html = normalizeFooter(html);
    validate(fullPath, html);
    fs.writeFileSync(fullPath, html);
  }
}

walk(siteDir);
console.log('Divine Blueprint navigation order stabilized for CMS runtime selectors.');
