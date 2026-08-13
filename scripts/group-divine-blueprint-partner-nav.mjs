import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
if (!fs.existsSync(siteDir)) throw new Error(`Divine Blueprint site directory not found: ${siteDir}`);

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

const isAmbassador = (anchor) => normalizeHref(hrefOf(anchor)) === '/ambassadors' || /^(Ambassadors?|Become an Ambassador)$/i.test(textOf(anchor));
const isChurchPartner = (anchor) => normalizeHref(hrefOf(anchor)) === '/church-partners' || /^(Church Partners?|Church Partnership)$/i.test(textOf(anchor));
const isAbout = (anchor) => normalizeHref(hrefOf(anchor)) === '/about' || /^About$/i.test(textOf(anchor));
const isGive = (anchor) => normalizeHref(hrefOf(anchor)) === '/give-a-copy' || /^Give a Copy$/i.test(textOf(anchor));

function removeDropdown(body, attribute) {
  const pattern = new RegExp(`<div\\b[^>]*${attribute}[^>]*>[\\s\\S]*?<\\/div>\\s*<\\/div>`, 'gi');
  return body.replace(pattern, '');
}

function buildPartnerDropdown({ ambassadorCurrent, churchCurrent }) {
  const current = ambassadorCurrent || churchCurrent;
  return `<div class="nav-dropdown${current ? ' is-current' : ''}" data-partner-menu data-nav-dropdown>
<button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">Partner With Us <span aria-hidden="true">▾</span></button>
<div class="nav-dropdown-menu" role="group" aria-label="Partner With Us">
<a href="/ambassadors"${ambassadorCurrent ? ' aria-current="page"' : ''}>Become an Ambassador</a>
<a href="/church-partners"${churchCurrent ? ' aria-current="page"' : ''}>Church Partners</a>
</div>
</div>`;
}

function groupNavigation(html, filePath) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;
  return html.replace(navPattern, (_match, open, body, close) => {
    body = removeDropdown(body, 'data-partner-menu');

    const anchors = body.match(anchorPattern) || [];
    const ambassadorSource = anchors.find(isAmbassador) || '';
    const churchSource = anchors.find(isChurchPartner) || '';
    const ambassadorCurrent = /\saria-current=["']page["']/i.test(ambassadorSource) || /(?:^|\/)ambassadors(?:\/|$)/i.test(filePath);
    const churchCurrent = /\saria-current=["']page["']/i.test(churchSource) || /(?:^|\/)church-partners(?:\/|$)/i.test(filePath);

    body = body.replace(anchorPattern, (anchor) => (isAmbassador(anchor) || isChurchPartner(anchor)) ? '' : anchor);
    body = body.replace(/\n{2,}/g, '\n').trim();

    const partnerDropdown = buildPartnerDropdown({ ambassadorCurrent, churchCurrent });
    const remainingAnchors = body.match(anchorPattern) || [];
    const aboutAnchor = remainingAnchors.find(isAbout);
    const giveAnchor = remainingAnchors.find(isGive);

    if (aboutAnchor) {
      body = body.replace(aboutAnchor, `${aboutAnchor}\n${partnerDropdown}`);
    } else if (giveAnchor) {
      body = body.replace(giveAnchor, `${partnerDropdown}\n${giveAnchor}`);
    } else {
      body = `${body}\n${partnerDropdown}`;
    }

    return `${open}${body}${close}`;
  });
}

function validate(filePath, html) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const partnerMenus = nav.match(/data-partner-menu/gi) || [];
  if (partnerMenus.length !== 1) throw new Error(`${filePath}: expected exactly one Partner With Us dropdown, found ${partnerMenus.length}`);

  const partnerBlock = nav.match(/<div\b[^>]*data-partner-menu[^>]*>[\s\S]*?<\/div>\s*<\/div>/i)?.[0] || '';
  if (!/Partner With Us/i.test(partnerBlock)) throw new Error(`${filePath}: Partner With Us label missing`);

  const partnerAnchors = partnerBlock.match(anchorPattern) || [];
  const ambassadorLinks = partnerAnchors.filter(isAmbassador);
  const churchLinks = partnerAnchors.filter(isChurchPartner);
  if (ambassadorLinks.length !== 1) throw new Error(`${filePath}: expected one Ambassador link inside Partner With Us, found ${ambassadorLinks.length}`);
  if (churchLinks.length !== 1) throw new Error(`${filePath}: expected one Church Partners link inside Partner With Us, found ${churchLinks.length}`);
  if (textOf(ambassadorLinks[0]) !== 'Become an Ambassador') throw new Error(`${filePath}: Ambassador dropdown label is not canonical`);
  if (textOf(churchLinks[0]) !== 'Church Partners') throw new Error(`${filePath}: Church Partners dropdown label is not canonical`);

  let topLevel = removeDropdown(nav, 'data-journey-menu');
  topLevel = removeDropdown(topLevel, 'data-resource-menu');
  topLevel = removeDropdown(topLevel, 'data-partner-menu');
  const labels = (topLevel.match(anchorPattern) || []).map(textOf);
  const expected = ['Home', 'The Companion', 'About', 'Give a Copy'];
  if (labels.length !== expected.length || labels.some((label, index) => label !== expected[index])) {
    throw new Error(`${filePath}: unexpected top-level navigation after partner grouping: ${labels.join(' | ')}`);
  }

  const aboutIndex = nav.indexOf('>About<');
  const partnerIndex = nav.indexOf('data-partner-menu');
  const giveIndex = nav.indexOf('>Give a Copy<');
  if (!(aboutIndex >= 0 && aboutIndex < partnerIndex && partnerIndex < giveIndex)) {
    throw new Error(`${filePath}: expected About, Partner With Us, Give a Copy order`);
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
    const after = groupNavigation(before, fullPath);
    validate(fullPath, after);
    if (after !== before) {
      fs.writeFileSync(fullPath, after);
      updated += 1;
    }
  }
}

walk(siteDir);
console.log(`Grouped Ambassadors and Church Partners under Partner With Us across ${updated} Divine Blueprint page(s).`);
