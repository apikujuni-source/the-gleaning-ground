import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const cssPath = path.join(siteDir, 'assets', 'styles.css');
const jsDir = path.join(siteDir, 'assets', 'js');
const jsPath = path.join(jsDir, 'resource-dropdown.js');
const styleMarker = '/* Divine Blueprint Resources Dropdown */';
const scriptSrc = '/assets/js/resource-dropdown.js';

if (!fs.existsSync(siteDir)) {
  throw new Error(`Divine Blueprint site directory not found: ${siteDir}`);
}

const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
const textOf = (anchor) => anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hrefOf = (anchor) => anchor.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
const normalizeHref = (href) => {
  let value = String(href || '').trim().replace(/^https?:\/\/[^/]+/i, '');
  value = value.replace(/[?#].*$/, '').replace(/index\.html$/i, '').replace(/\.html$/i, '');
  value = value.replace(/\/+$/, '');
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value.replace(/^(?:\.\.\/|\.\/)+/, '')}`;
};

const resourceRoutes = new Map([
  ['/bible-studies', 'Bible Studies'],
  ['/teachings', 'Teachings'],
  ['/podcast', 'Podcast']
]);

function resourceKey(anchor) {
  const route = normalizeHref(hrefOf(anchor));
  if (resourceRoutes.has(route)) return route;
  const text = textOf(anchor).toLowerCase();
  for (const [candidate, label] of resourceRoutes) {
    if (text === label.toLowerCase()) return candidate;
  }
  return '';
}

function buildResourceAnchor(route, source = '') {
  const label = resourceRoutes.get(route);
  const current = /\saria-current=["']page["']/i.test(source);
  return `<a href="${route}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
}

function condenseNavigation(html) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;

  return html.replace(navPattern, (_match, open, body, close) => {
    const found = new Map();
    const allAnchors = body.match(anchorPattern) || [];
    for (const anchor of allAnchors) {
      const key = resourceKey(anchor);
      if (key && !found.has(key)) found.set(key, anchor);
    }

    body = body.replace(/<div\b[^>]*data-resource-menu[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
    body = body.replace(anchorPattern, (anchor) => resourceKey(anchor) ? '' : anchor);
    body = body.replace(/\n{2,}/g, '\n').trim();

    const resourceLinks = [...resourceRoutes.keys()]
      .map((route) => buildResourceAnchor(route, found.get(route) || ''))
      .join('\n');
    const hasCurrent = [...found.values()].some((anchor) => /\saria-current=["']page["']/i.test(anchor));
    const dropdown = `<div class="nav-dropdown${hasCurrent ? ' is-current' : ''}" data-resource-menu>
<button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">Resources <span aria-hidden="true">▾</span></button>
<div class="nav-dropdown-menu" role="group" aria-label="Resources">
${resourceLinks}
</div>
</div>`;

    const journeyPattern = /(<a\b[^>]*href=["'](?:\/|(?:\.\.\/)*|\.\/)?journey(?:\.html)?["'][^>]*>[\s\S]*?<\/a>)/i;
    if (journeyPattern.test(body)) body = body.replace(journeyPattern, `$1\n${dropdown}`);
    else body = `${body}\n${dropdown}`;

    return `${open}${body}${close}`;
  });
}

function validate(filePath, html) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const dropdowns = nav.match(/data-resource-menu/gi) || [];
  if (dropdowns.length !== 1) throw new Error(`${filePath}: expected one Resources dropdown, found ${dropdowns.length}`);

  const navWithoutDropdown = nav.replace(/<div\b[^>]*data-resource-menu[^>]*>[\s\S]*?<\/div>\s*<\/div>/i, '');
  const directLegacy = (navWithoutDropdown.match(anchorPattern) || []).filter((anchor) => resourceKey(anchor));
  for (const route of resourceRoutes.keys()) {
    const count = (nav.match(anchorPattern) || []).filter((anchor) => resourceKey(anchor) === route).length;
    if (count !== 1) throw new Error(`${filePath}: expected one ${route} dropdown link, found ${count}`);
  }
  if (directLegacy.length) throw new Error(`${filePath}: standalone resource links remain outside the dropdown`);

  const directTopLevel = navWithoutDropdown.match(anchorPattern) || [];
  const labels = directTopLevel.map(textOf);
  const expected = ['Home', 'Start Here', 'The Journey', 'The Companion', 'About', 'Church Partners', 'Give a Copy'];
  for (let index = 0; index < expected.length; index += 1) {
    if (labels[index] !== expected[index]) {
      throw new Error(`${filePath}: unexpected top-level navigation order: ${labels.join(' | ')}`);
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
    let after = condenseNavigation(before);
    if (!after.includes(scriptSrc)) {
      after = after.replace(/\s*<\/body>/i, `\n<script src="${scriptSrc}" defer></script>\n</body>`);
    }
    validate(fullPath, after);
    if (after !== before) {
      fs.writeFileSync(fullPath, after);
      updated += 1;
    }
  }
}
walk(siteDir);

if (!fs.existsSync(cssPath)) throw new Error(`Stylesheet not found: ${cssPath}`);
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes(styleMarker)) {
  css += `
${styleMarker}
.nav-dropdown{position:relative;display:flex;align-items:center}.nav-dropdown-toggle{display:inline-flex;align-items:center;gap:.3rem;padding:.5rem .2rem;border:0;border-bottom:2px solid transparent;background:transparent;color:inherit;font:inherit;font-size:inherit;cursor:pointer}.nav-dropdown-toggle:hover,.nav-dropdown.is-current .nav-dropdown-toggle,.nav-dropdown.open .nav-dropdown-toggle{color:var(--gold);border-bottom-color:var(--gold)}.nav-dropdown-toggle span{font-size:.75em;transition:transform .18s ease}.nav-dropdown.open .nav-dropdown-toggle span{transform:rotate(180deg)}.nav-dropdown-menu{position:absolute;z-index:120;top:calc(100% + .55rem);left:0;display:none;min-width:205px;padding:.55rem;background:var(--paper);border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 42px rgba(15,35,52,.16)}.nav-dropdown-menu a{display:block;width:100%;padding:.7rem .8rem;border:0;border-radius:8px;white-space:nowrap}.nav-dropdown-menu a:hover,.nav-dropdown-menu a[aria-current="page"]{background:rgba(189,138,53,.1);border-bottom-color:transparent}.nav-dropdown.open .nav-dropdown-menu{display:block}@media(hover:hover) and (min-width:901px){.nav-dropdown:hover .nav-dropdown-menu{display:block}}@media(max-width:900px){.nav-dropdown{display:block;width:100%}.nav-dropdown-toggle{justify-content:space-between;width:100%;padding:.65rem .2rem}.nav-dropdown-menu{position:static;min-width:0;margin:.15rem 0 .35rem;padding:.25rem 0 .25rem .8rem;border:0;border-left:2px solid rgba(189,138,53,.35);border-radius:0;box-shadow:none;background:transparent}.nav-dropdown-menu a{padding:.6rem .75rem;white-space:normal}}
`;
  fs.writeFileSync(cssPath, css);
}

fs.mkdirSync(jsDir, { recursive: true });
const runtime = `(() => {
  const menus = [...document.querySelectorAll('[data-resource-menu]')];
  if (!menus.length) return;

  const close = (menu) => {
    menu.classList.remove('open');
    menu.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
  };

  for (const menu of menus) {
    const button = menu.querySelector('.nav-dropdown-toggle');
    if (!button) continue;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = !menu.classList.contains('open');
      for (const other of menus) close(other);
      if (opening) {
        menu.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        close(menu);
        button.focus();
      }
    });
    for (const link of menu.querySelectorAll('a')) {
      link.addEventListener('click', () => close(menu));
    }
  }

  document.addEventListener('click', (event) => {
    for (const menu of menus) {
      if (!menu.contains(event.target)) close(menu);
    }
  });
})();
`;
fs.writeFileSync(jsPath, runtime);

console.log(`Resources dropdown installed across ${updated} Divine Blueprint page(s).`);
