import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const assetsRoot = join(siteRoot, "assets");
const stylesPath = join(assetsRoot, "styles.css");
const runtimePath = join(assetsRoot, "canonical-book-cover.js");
const canonicalCover = "/assets/divine-blueprint-cover.webp?v=20260723-cover-v2";
const canonicalAlt = "The Divine Blueprint by Ayo-Paul Ikujuni book cover";

if (!existsSync(join(assetsRoot, "divine-blueprint-cover.webp"))) {
  throw new Error("The canonical Divine Blueprint cover must be generated before site-wide cover normalization.");
}

function addClass(tag, className) {
  const classMatch = tag.match(/\bclass=(['"])(.*?)\1/i);
  if (classMatch) {
    const classes = new Set(classMatch[2].split(/\s+/).filter(Boolean));
    classes.add(className);
    return tag.replace(classMatch[0], `class=${classMatch[1]}${[...classes].join(" ")}${classMatch[1]}`);
  }
  return tag.replace(/\s*\/?\>$/, (ending) => ` class="${className}"${ending}`);
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp(`\\b${name}=(['"])(.*?)\\1`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, `${name}="${value}"`);
  return tag.replace(/\s*\/?\>$/, (ending) => ` ${name}="${value}"${ending}`);
}

function isBookCoverImage(tag) {
  const src = tag.match(/\bsrc=(['"])(.*?)\1/i)?.[2] || "";
  const alt = tag.match(/\balt=(['"])(.*?)\1/i)?.[2] || "";
  const classes = tag.match(/\bclass=(['"])(.*?)\1/i)?.[2] || "";
  const identity = `${src} ${alt} ${classes}`.toLowerCase();
  if (identity.includes("home-mockup")) return false;
  if (identity.includes("companion") && !identity.includes("book cover")) return false;
  return (
    identity.includes("divine-blueprint-cover") ||
    identity.includes("divine blueprint book cover") ||
    identity.includes("hero-book-cover-image") ||
    /(?:^|[\s_-])book[\s_-]*cover(?:$|[\s_-])/.test(identity)
  );
}

function normalizeBookImages(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!isBookCoverImage(tag)) return tag;
    let updated = setAttribute(tag, "src", canonicalCover);
    updated = setAttribute(updated, "alt", canonicalAlt);
    updated = setAttribute(updated, "loading", "eager");
    updated = setAttribute(updated, "decoding", "async");
    updated = addClass(updated, "canonical-book-cover-image");
    return updated;
  });
}

function replaceKnownBookPlaceholders(html) {
  return html.replace(
    /<div\b([^>]*class=(['"])[^'"<>]*(?:book-mockup|book-cover-placeholder|book-cover-visual)[^'"<>]*\2[^>]*)>[\s\S]*?<\/div>/gi,
    (match, attrs) => {
      if (/companion/i.test(match)) return match;
      return `<div ${attrs} class="canonical-book-cover-frame"><img class="canonical-book-cover-image" src="${canonicalCover}" alt="${canonicalAlt}" loading="eager" decoding="async"></div>`;
    }
  );
}

const runtime = `(() => {
  const COVER = ${JSON.stringify(canonicalCover)};
  const ALT = ${JSON.stringify(canonicalAlt)};

  function isBookCoverImage(img) {
    const identity = [img.getAttribute('src'), img.getAttribute('alt'), img.className]
      .filter(Boolean).join(' ').toLowerCase();
    if (identity.includes('home-mockup')) return false;
    if (identity.includes('companion') && !identity.includes('book cover')) return false;
    return identity.includes('divine-blueprint-cover') ||
      identity.includes('divine blueprint book cover') ||
      identity.includes('hero-book-cover-image') ||
      /(?:^|[\\s_-])book[\\s_-]*cover(?:$|[\\s_-])/.test(identity);
  }

  function normalize(img) {
    img.src = COVER;
    img.alt = ALT;
    img.classList.add('canonical-book-cover-image');
    img.setAttribute('decoding', 'async');
    img.parentElement?.classList.add('canonical-book-cover-frame');
  }

  function replaceTextPlaceholder(el) {
    if (el.querySelector('img')) return;
    const text = (el.textContent || '').replace(/\\s+/g, ' ').trim().toUpperCase();
    if (!text.includes('THE DIVINE BLUEPRINT') || text.includes('COMPANION')) return;
    if (text.length > 220) return;
    const img = document.createElement('img');
    img.src = COVER;
    img.alt = ALT;
    img.className = 'canonical-book-cover-image';
    img.decoding = 'async';
    el.replaceChildren(img);
    el.classList.add('canonical-book-cover-frame');
  }

  function apply() {
    if (location.pathname.includes('/companion')) document.body.classList.add('companion-page');
    document.querySelectorAll('img').forEach((img) => {
      if (isBookCoverImage(img)) normalize(img);
    });
    document.querySelectorAll('.book-mockup,.book-cover-placeholder,.book-cover-visual,.book-art').forEach(replaceTextPlaceholder);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
`;

await writeFile(runtimePath, runtime, "utf8");

const cssMarker = "/* Canonical Divine Blueprint book cover */";
let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(cssMarker)) {
  styles += `

${cssMarker}
.canonical-book-cover-frame{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-width:0!important;
  overflow:visible!important;
  background:transparent!important;
}
.canonical-book-cover-image,
img[src*="divine-blueprint-cover"]{
  display:block!important;
  width:min(420px,100%)!important;
  max-width:100%!important;
  height:auto!important;
  max-height:none!important;
  aspect-ratio:auto!important;
  object-fit:contain!important;
  object-position:center center!important;
  clip-path:none!important;
  border-radius:2px;
  filter:drop-shadow(18px 24px 28px rgba(7,26,48,.22));
}
body.companion-page .canonical-book-cover-frame,
body.companion-page .hero-art,
body.companion-page [class*="book-visual"],
body.companion-page [class*="cover-wrap"]{
  overflow:visible!important;
  min-height:0!important;
  height:auto!important;
}
body.companion-page .canonical-book-cover-image,
body.companion-page img[src*="divine-blueprint-cover"]{
  width:min(360px,100%)!important;
  height:auto!important;
  max-height:620px!important;
  object-fit:contain!important;
  object-position:center center!important;
  transform:none!important;
}
@media (max-width:760px){
  .canonical-book-cover-image,
  img[src*="divine-blueprint-cover"]{width:min(320px,92vw)!important;max-height:none!important}
}
`;
  await writeFile(stylesPath, styles, "utf8");
}

async function processHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await processHtml(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    let html = await readFile(path, "utf8");
    html = replaceKnownBookPlaceholders(normalizeBookImages(html));
    if (!html.includes("assets/canonical-book-cover.js")) {
      html = html.replace("</body>", '<script src="/assets/canonical-book-cover.js"></script>\n</body>');
    }
    await writeFile(path, html, "utf8");
  }
}

await processHtml(siteRoot);
console.log("Applied the canonical Divine Blueprint cover across the site and disabled cover cropping.");
