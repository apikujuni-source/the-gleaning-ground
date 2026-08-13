import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');

if (!fs.existsSync(siteDir)) {
  throw new Error(`Divine Blueprint site directory not found: ${siteDir}`);
}

const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
const textOf = (anchor) => anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hrefOf = (anchor) => anchor.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';

function normalizeHref(href) {
  let value = String(href || '').trim().replace(/^https?:\/\/[^/]+/i, '');
  value = value.replace(/[?#].*$/, '').replace(/index\.html$/i, '').replace(/\.html$/i, '');
  value = value.replace(/\/+$/, '');
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value.replace(/^(?:\.\.\/|\.\/)+/, '')}`;
}

const isAmbassador = (anchor) => normalizeHref(hrefOf(anchor)) === '/ambassadors' || /^Ambassadors?$/i.test(textOf(anchor));
const isGive = (anchor) => normalizeHref(hrefOf(anchor)) === '/give-a-copy' || /^(Give a Copy|Sponsor Copies|Build a Copy)$/i.test(textOf(anchor));
const isPartner = (anchor) => normalizeHref(hrefOf(anchor)) === '/church-partners' || /^Church Partners$/i.test(textOf(anchor));
const isAbout = (anchor) => normalizeHref(hrefOf(anchor)) === '/about' || /^About$/i.test(textOf(anchor));

function stripTargetLinks(body) {
  return body
    .replace(/\s*<br\s*\/?>\s*(<a\b[^>]*>[\s\S]*?<\/a>)/gi, (match, anchor) => (isAmbassador(anchor) || isGive(anchor)) ? '' : match)
    .replace(/(<a\b[^>]*>[\s\S]*?<\/a>)\s*<br\s*\/?>/gi, (match, anchor) => (isAmbassador(anchor) || isGive(anchor)) ? '' : match)
    .replace(anchorPattern, (anchor) => (isAmbassador(anchor) || isGive(anchor)) ? '' : anchor);
}

function patchNavigation(html, currentRoute = '') {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;

  return html.replace(navPattern, (_match, open, body, close) => {
    body = stripTargetLinks(body);

    const ambassador = `<a href="/ambassadors"${currentRoute === '/ambassadors' ? ' aria-current="page"' : ''}>Ambassadors</a>`;
    const give = `<a href="/give-a-copy"${currentRoute === '/give-a-copy' ? ' aria-current="page"' : ''}>Give a Copy</a>`;

    const anchors = body.match(anchorPattern) || [];
    const partnerAnchor = anchors.find(isPartner);
    const aboutAnchor = anchors.find(isAbout);

    if (partnerAnchor) {
      body = body.replace(partnerAnchor, `${ambassador}\n${partnerAnchor}\n${give}`);
    } else if (aboutAnchor) {
      body = body.replace(aboutAnchor, `${aboutAnchor}\n${ambassador}\n${give}`);
    } else {
      body = `${body}\n${ambassador}\n${give}`;
    }

    return `${open}${body}${close}`;
  });
}

function patchFooter(html) {
  const connectPattern = /(<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>)([\s\S]*?)(<\/div>)/i;
  return html.replace(connectPattern, (_match, open, body, close) => {
    body = stripTargetLinks(body);
    const ambassador = '<a href="/ambassadors" data-ambassador-footer-link>Ambassadors</a>';
    const give = '<a href="/give-a-copy" data-give-a-copy-footer-link>Give a Copy</a>';
    const anchors = body.match(anchorPattern) || [];
    const partnerAnchor = anchors.find(isPartner);

    if (partnerAnchor) {
      body = body.replace(partnerAnchor, `${ambassador}<br>${partnerAnchor}<br>${give}`);
    } else {
      body = `${body}<br>${ambassador}<br>${give}`;
    }

    return `${open}${body}${close}`;
  });
}

function validate(filePath, html) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const navAnchors = nav.match(anchorPattern) || [];
  const ambassadorCount = navAnchors.filter(isAmbassador).length;
  const giveCount = navAnchors.filter(isGive).length;

  if (ambassadorCount !== 1) {
    throw new Error(`${filePath}: expected exactly one Ambassadors navigation link, found ${ambassadorCount}`);
  }
  if (giveCount !== 1) {
    throw new Error(`${filePath}: expected exactly one Give a Copy navigation link, found ${giveCount}`);
  }

  const connect = html.match(/<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>([\s\S]*?)<\/div>/i)?.[1] || '';
  if (connect) {
    const footerAnchors = connect.match(anchorPattern) || [];
    const footerAmbassadorCount = footerAnchors.filter(isAmbassador).length;
    const footerGiveCount = footerAnchors.filter(isGive).length;
    if (footerAmbassadorCount !== 1) {
      throw new Error(`${filePath}: expected exactly one Ambassadors footer link, found ${footerAmbassadorCount}`);
    }
    if (footerGiveCount !== 1) {
      throw new Error(`${filePath}: expected exactly one Give a Copy footer link, found ${footerGiveCount}`);
    }
  }
}

let updated = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const before = fs.readFileSync(fullPath, 'utf8');
    let currentRoute = '';
    if (/(?:^|\/)ambassadors(?:\/index)?\.html$/i.test(fullPath)) currentRoute = '/ambassadors';
    if (/(?:^|\/)give-a-copy(?:\/index)?\.html$/i.test(fullPath)) currentRoute = '/give-a-copy';

    let after = patchNavigation(before, currentRoute);
    after = patchFooter(after);
    validate(fullPath, after);

    if (after !== before) {
      fs.writeFileSync(fullPath, after);
      updated += 1;
    }
  }
}

walk(siteDir);
console.log(`Final Divine Blueprint navigation pass complete across ${updated} page(s): one Ambassadors link and one Give a Copy link per navigation/footer.`);
