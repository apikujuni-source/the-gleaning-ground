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

const journeyRoutes = new Map([
  ['/start-here', 'Start Here'],
  ['/journey', 'All Chapters']
]);

const resourceRoutes = new Map([
  ['/bible-studies', 'Bible Studies'],
  ['/teachings', 'Teachings'],
  ['/podcast', 'Podcast']
]);

function routeKey(anchor, routes) {
  const route = normalizeHref(hrefOf(anchor));
  if (routes.has(route)) return route;
  const text = textOf(anchor).toLowerCase();
  for (const [candidate, label] of routes) {
    if (text === label.toLowerCase()) return candidate;
  }
  if (routes === journeyRoutes && text === 'the journey') return '/journey';
  return '';
}

function buildAnchor(route, routes, source = '') {
  const label = routes.get(route);
  const current = /\saria-current=["']page["']/i.test(source);
  return `<a href="${route}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
}

function removeDropdown(body, attribute) {
  const pattern = new RegExp(`<div\\b[^>]*${attribute}[^>]*>[\\s\\S]*?<\\/div>\\s*<\\/div>`, 'gi');
  return body.replace(pattern, '');
}

function buildDropdown({ attribute, label, routes, found }) {
  const links = [...routes.keys()]
    .map((route) => buildAnchor(route, routes, found.get(route) || ''))
    .join('\n');
  const hasCurrent = [...found.values()].some((anchor) => /\saria-current=["']page["']/i.test(anchor));
  return `<div class="nav-dropdown${hasCurrent ? ' is-current' : ''}" ${attribute} data-nav-dropdown>
<button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">${label} <span aria-hidden="true">▾</span></button>
<div class="nav-dropdown-menu" role="group" aria-label="${label}">
${links}
</div>
</div>`;
}

function condenseNavigation(html) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;

  return html.replace(navPattern, (_match, open, body, close) => {
    const journeyFound = new Map();
    const resourceFound = new Map();
    const allAnchors = body.match(anchorPattern) || [];

    for (const anchor of allAnchors) {
      const journey = routeKey(anchor, journeyRoutes);
      const resource = routeKey(anchor, resourceRoutes);
      if (journey && !journeyFound.has(journey)) journeyFound.set(journey, anchor);
      if (resource && !resourceFound.has(resource)) resourceFound.set(resource, anchor);
    }

    body = removeDropdown(body, 'data-journey-menu');
    body = removeDropdown(body, 'data-resource-menu');
    body = body.replace(anchorPattern, (anchor) => {
      if (routeKey(anchor, journeyRoutes) || routeKey(anchor, resourceRoutes)) return '';
      return anchor;
    });
    body = body.replace(/\n{2,}/g, '\n').trim();

    const journeyDropdown = buildDropdown({
      attribute: 'data-journey-menu',
      label: 'Journey',
      routes: journeyRoutes,
      found: journeyFound
    });
    const resourceDropdown = buildDropdown({
      attribute: 'data-resource-menu',
      label: 'Resources',
      routes: resourceRoutes,
      found: resourceFound
    });

    const homePattern = /(<a\b[^>]*href=["'](?:\/|index\.html)["'][^>]*>\s*Home\s*<\/a>)/i;
    if (homePattern.test(body)) {
      body = body.replace(homePattern, `$1\n${journeyDropdown}\n${resourceDropdown}`);
    } else {
      body = `${journeyDropdown}\n${resourceDropdown}\n${body}`;
    }

    return `${open}${body}${close}`;
  });
}

function validate(filePath, html) {
  const nav = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
  const journeyDropdowns = nav.match(/data-journey-menu/gi) || [];
  const resourceDropdowns = nav.match(/data-resource-menu/gi) || [];
  if (journeyDropdowns.length !== 1) throw new Error(`${filePath}: expected one Journey dropdown, found ${journeyDropdowns.length}`);
  if (resourceDropdowns.length !== 1) throw new Error(`${filePath}: expected one Resources dropdown, found ${resourceDropdowns.length}`);

  for (const [routes, name] of [[journeyRoutes, 'Journey'], [resourceRoutes, 'Resources']]) {
    for (const route of routes.keys()) {
      const count = (nav.match(anchorPattern) || []).filter((anchor) => routeKey(anchor, routes) === route).length;
      if (count !== 1) throw new Error(`${filePath}: expected one ${route} link in ${name}, found ${count}`);
    }
  }

  let topLevel = removeDropdown(nav, 'data-journey-menu');
  topLevel = removeDropdown(topLevel, 'data-resource-menu');
  const labels = (topLevel.match(anchorPattern) || []).map(textOf);
  const expected = ['Home', 'The Companion', 'About', 'Church Partners', 'Give a Copy'];
  if (labels.length !== expected.length || labels.some((label, index) => label !== expected[index])) {
    throw new Error(`${filePath}: unexpected top-level navigation order: ${labels.join(' | ')}`);
  }

  const homeIndex = nav.indexOf('>Home<');
  const journeyIndex = nav.indexOf('data-journey-menu');
  const resourceIndex = nav.indexOf('data-resource-menu');
  const companionIndex = nav.indexOf('>The Companion<');
  if (!(homeIndex >= 0 && homeIndex < journeyIndex && journeyIndex < resourceIndex && resourceIndex < companionIndex)) {
    throw new Error(`${filePath}: expected Home, Journey, Resources, The Companion order`);
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
  const menus = [...document.querySelectorAll('[data-nav-dropdown]')];
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

console.log(`Journey and Resources dropdowns installed across ${updated} Divine Blueprint page(s).`);
