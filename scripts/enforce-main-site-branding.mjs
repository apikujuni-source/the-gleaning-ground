import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const siteRoot = resolve("_site");
const excludedRoots = [
  resolve("_site/admin"),
  resolve("_site/divine-blueprint-site")
];
const settingsPath = "content/site.json";

if (!existsSync(settingsPath)) throw new Error(`Missing site settings: ${settingsPath}`);
if (!existsSync(siteRoot)) throw new Error("The public site must be built before branding is enforced.");

const settings = JSON.parse(await readFile(settingsPath, "utf8"));
const siteName = String(settings.name || "The Gleaning Ground").trim();
const logoPath = String(settings.logo || "/assets/uploads/logo_official.png").trim();
const logoAlt = String(settings.logoAlt || "The Gleaning Ground official logo").trim();

if (!siteName) throw new Error("The site name is empty in content/site.json.");
if (!logoPath) throw new Error("The official logo path is empty in content/site.json.");

if (logoPath.startsWith("/assets/uploads/")) {
  const sourcePath = join("content/uploads", basename(logoPath));
  if (!existsSync(sourcePath)) throw new Error(`Official logo file not found: ${sourcePath}`);
}

const escapeAttribute = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const logoMarkup = `<img class="official-site-logo" src="${escapeAttribute(logoPath)}" alt="${escapeAttribute(logoAlt)}">`;
const nameMarkup = `<span class="official-site-name"><strong>${escapeHtml(siteName)}</strong></span>`;
const brandMarkup = `${logoMarkup}${nameMarkup}`;

const styleBlock = `<style id="official-brand-visibility">
.brand{display:inline-flex!important;align-items:center!important;gap:.72rem!important;visibility:visible!important;opacity:1!important;text-decoration:none!important}
.brand .official-site-logo{display:block!important;width:68px!important;height:68px!important;max-width:none!important;flex:0 0 68px!important;object-fit:contain!important;object-position:center!important;background:transparent!important;border:0!important;border-radius:0!important;filter:none!important;transform:none!important;visibility:visible!important;opacity:1!important}
.brand .official-site-name{display:block!important;position:static!important;width:auto!important;height:auto!important;overflow:visible!important;clip:auto!important;clip-path:none!important;white-space:normal!important;visibility:visible!important;opacity:1!important;color:#17392f!important;line-height:1.05!important}
.brand .official-site-name strong{display:block!important;font-size:1.08rem!important;font-weight:800!important;letter-spacing:.025em!important;white-space:nowrap!important;color:#17392f!important;visibility:visible!important;opacity:1!important}
@media(max-width:680px){.brand{gap:.5rem!important}.brand .official-site-logo{width:54px!important;height:54px!important;flex-basis:54px!important}.brand .official-site-name strong{font-size:.9rem!important;white-space:normal!important;max-width:8rem!important}}
</style>`;

const guardScript = `<script id="official-brand-guard">
(() => {
  const logoPath = ${JSON.stringify(logoPath)};
  const logoAlt = ${JSON.stringify(logoAlt)};
  const siteName = ${JSON.stringify(siteName)};
  let observer;
  let scheduled = false;

  const hasClass = (element, name) => element?.classList?.contains(name);

  const enforce = () => {
    scheduled = false;
    for (const brand of document.querySelectorAll('.brand')) {
      brand.style.removeProperty('display');
      brand.removeAttribute('hidden');
      brand.setAttribute('aria-label', siteName);

      let logo = brand.querySelector('.official-site-logo');
      if (!logo) {
        logo = document.createElement('img');
        logo.className = 'official-site-logo';
        brand.prepend(logo);
      }
      if (logo.getAttribute('src') !== logoPath) logo.setAttribute('src', logoPath);
      if (logo.getAttribute('alt') !== logoAlt) logo.setAttribute('alt', logoAlt);
      logo.removeAttribute('srcset');
      logo.removeAttribute('sizes');
      logo.removeAttribute('hidden');

      let name = brand.querySelector('.official-site-name');
      if (!name) {
        name = document.createElement('span');
        name.className = 'official-site-name';
        brand.append(name);
      }
      name.removeAttribute('hidden');

      let strong = name.querySelector('strong');
      if (!strong) {
        strong = document.createElement('strong');
        name.replaceChildren(strong);
      }
      if (strong.textContent !== siteName) strong.textContent = siteName;
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(enforce);
  };

  enforce();
  document.addEventListener('DOMContentLoaded', enforce, { once: true });
  window.addEventListener('load', enforce, { once: true });

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (hasClass(target, 'brand') || target?.closest?.('.brand') || [...mutation.addedNodes].some((node) => node instanceof Element && (hasClass(node, 'brand') || node.querySelector?.('.brand')))) {
        schedule();
        return;
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes', 'alt', 'class', 'style', 'hidden'] });
})();
</script>`;

function classTokens(attributes) {
  const match = attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
  return match ? match[2].split(/\s+/).filter(Boolean) : [];
}

function replaceBrandAnchors(html) {
  return html.replace(/<a\b([^>]*)>[\s\S]*?<\/a>/gi, (whole, attributes) => {
    if (!classTokens(attributes).includes("brand")) return whole;
    return `<a${attributes}>${brandMarkup}</a>`;
  });
}

function injectOrReplace(html) {
  let updated = replaceBrandAnchors(html)
    .replace(/<style id="official-brand-visibility">[\s\S]*?<\/style>/g, "")
    .replace(/<script id="official-brand-guard">[\s\S]*?<\/script>/g, "");

  updated = updated.includes("</head>")
    ? updated.replace("</head>", `${styleBlock}\n</head>`)
    : `${styleBlock}\n${updated}`;

  updated = updated.includes("</body>")
    ? updated.replace("</body>", `${guardScript}\n</body>`)
    : `${updated}\n${guardScript}\n`;

  return updated;
}

function isExcluded(path) {
  return excludedRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

async function listHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (isExcluded(path)) continue;
    if (entry.isDirectory()) files.push(...await listHtml(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

let updatedCount = 0;
let brandCount = 0;
for (const path of await listHtml(siteRoot)) {
  const original = await readFile(path, "utf8");
  const beforeBrands = (original.match(/class=["'][^"']*\bbrand\b[^"']*["']/g) || []).length;
  const updated = injectOrReplace(original);
  if (updated !== original) {
    await writeFile(path, updated, "utf8");
    updatedCount += 1;
  }
  brandCount += beforeBrands;
}

if (!brandCount) {
  throw new Error("No main-site brand element was found. The site name could not be installed.");
}

console.log(`Enforced the exact logo and visible site name on ${updatedCount} main-site HTML files (${brandCount} brand locations).`);
