import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const assetsRoot = join(siteRoot, "assets");
const stylesPath = join(assetsRoot, "styles.css");
const runtimePath = join(assetsRoot, "divine-blueprint-cover-final.js");
const coverFile = join(assetsRoot, "divine-blueprint-cover.webp");
const coverUrl = "/assets/divine-blueprint-cover.webp?v=20260723-final-cover";
const coverAlt = "The Divine Blueprint: The Making, Maturing, and Manifestation of God's Sons, by Ayo-Paul Ikujuni";

if (!existsSync(coverFile)) {
  throw new Error("The canonical Divine Blueprint cover asset was not generated.");
}

function addBodyClass(html, className) {
  if (/<body\b[^>]*class=/i.test(html)) {
    return html.replace(/<body\b([^>]*class=(['"])(.*?)\2[^>]*)>/i, (_match, attrs, quote, classes) => {
      const classSet = new Set(classes.split(/\s+/).filter(Boolean));
      classSet.add(className);
      return `<body${attrs.replace(/class=(['"])(.*?)\1/i, `class=${quote}${[...classSet].join(" ")}${quote}`)}>`;
    });
  }
  return html.replace(/<body\b([^>]*)>/i, `<body$1 class="${className}">`);
}

function replaceBalancedElementByClass(html, className, replacement) {
  const openingPattern = new RegExp(`<([a-z][a-z0-9:-]*)\\b[^>]*class=(['"])[^'"]*\\b${className}\\b[^'"]*\\2[^>]*>`, "i");
  const opening = openingPattern.exec(html);
  if (!opening) return html;

  const tagName = opening[1];
  const start = opening.index;
  const tokenPattern = new RegExp(`<${tagName}\\b[^>]*>|<\\/${tagName}\\s*>`, "gi");
  tokenPattern.lastIndex = start;
  let depth = 0;
  let token;

  while ((token = tokenPattern.exec(html))) {
    if (new RegExp(`^<${tagName}\\b`, "i").test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) {
      return html.slice(0, start) + replacement + html.slice(tokenPattern.lastIndex);
    }
  }

  throw new Error(`Could not find the closing tag for .${className}.`);
}

const coverMarkup = `<figure class="divine-blueprint-full-cover" aria-label="The Divine Blueprint book cover">
  <img class="divine-blueprint-full-cover-image canonical-book-cover-image" src="${coverUrl}" alt="${coverAlt}" width="1024" height="1536" loading="eager" decoding="async">
</figure>`;

function replaceCompanionVisual(html) {
  let updated = html;
  const targetClasses = [
    "companion-cover-visual",
    "companion-book-cover-visual",
    "journal-visual"
  ];

  for (const className of targetClasses) {
    updated = replaceBalancedElementByClass(updated, className, coverMarkup);
  }

  // Catch a remaining textual cover block even when its class was changed.
  updated = updated.replace(
    /<(div|figure)\b([^>]*)>[\s\S]{0,500}?THE\s+DIVINE[\s\S]{0,250}?BLUEPRINT[\s\S]{0,250}?COMPANION[\s\S]{0,500}?<\/\1>/gi,
    coverMarkup
  );

  return updated;
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp(`\\b${name}=(['"])(.*?)\\1`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, `${name}="${value}"`);
  return tag.replace(/\s*\/?>$/, (ending) => ` ${name}="${value}"${ending}`);
}

function normalizeKnownCoverImages(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const identity = [
      tag.match(/\bsrc=(['"])(.*?)\1/i)?.[2],
      tag.match(/\balt=(['"])(.*?)\1/i)?.[2],
      tag.match(/\bclass=(['"])(.*?)\1/i)?.[2]
    ].filter(Boolean).join(" ").toLowerCase();

    const isBookCover = identity.includes("divine-blueprint-cover") ||
      identity.includes("divine blueprint book cover") ||
      identity.includes("hero-book-cover-image") ||
      identity.includes("canonical-book-cover-image") ||
      identity.includes("divine-blueprint-full-cover-image") ||
      /(?:^|[\\s_-])book[\\s_-]*cover(?:$|[\\s_-])/.test(identity);

    if (!isBookCover) return tag;
    let updated = setAttribute(tag, "src", coverUrl);
    updated = setAttribute(updated, "alt", coverAlt);
    updated = setAttribute(updated, "loading", "eager");
    updated = setAttribute(updated, "decoding", "async");
    return updated;
  });
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
    const isCompanion = /(?:^|\/)companion(?:\/index)?\.html$/i.test(path.replace(/\\/g, "/"));
    if (isCompanion) {
      html = addBodyClass(html, "companion-page");
      html = replaceCompanionVisual(html);
    }
    html = normalizeKnownCoverImages(html);

    if (!html.includes("/assets/divine-blueprint-cover-final.js")) {
      html = html.replace("</body>", '<script src="/assets/divine-blueprint-cover-final.js?v=20260723"></script>\n</body>');
    }
    await writeFile(path, html, "utf8");
  }
}

const cssMarker = "/* FINAL Divine Blueprint full-cover rules */";
let styles = await readFile(stylesPath, "utf8");
const finalCss = `

${cssMarker}
.divine-blueprint-full-cover{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  margin:0!important;
  padding:clamp(8px,1.5vw,24px)!important;
  overflow:visible!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  transform:none!important;
}
.divine-blueprint-full-cover-image,
img[src*="divine-blueprint-cover.webp"]{
  display:block!important;
  width:min(420px,100%)!important;
  max-width:100%!important;
  height:auto!important;
  max-height:none!important;
  aspect-ratio:2/3!important;
  object-fit:contain!important;
  object-position:center center!important;
  margin:0 auto!important;
  padding:0!important;
  overflow:visible!important;
  clip:auto!important;
  clip-path:none!important;
  transform:none!important;
  border-radius:2px!important;
  filter:drop-shadow(18px 24px 28px rgba(7,26,48,.22));
}
body.companion-page .companion-hero-grid{
  align-items:center!important;
}
body.companion-page .companion-cover-visual,
body.companion-page .companion-book-cover-visual,
body.companion-page .journal-visual{
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  overflow:visible!important;
  background:transparent!important;
}
body.companion-page .divine-blueprint-full-cover-image{
  width:min(390px,100%)!important;
}
@media(max-width:760px){
  body.companion-page .divine-blueprint-full-cover-image,
  .divine-blueprint-full-cover-image,
  img[src*="divine-blueprint-cover.webp"]{
    width:min(330px,88vw)!important;
    height:auto!important;
    max-height:none!important;
  }
}
`;

if (styles.includes(cssMarker)) {
  styles = styles.slice(0, styles.indexOf(cssMarker)).replace(/\s+$/, "") + finalCss;
} else {
  styles += finalCss;
}
await writeFile(stylesPath, styles, "utf8");

const runtime = `(() => {
  const COVER = ${JSON.stringify(coverUrl)};
  const ALT = ${JSON.stringify(coverAlt)};
  const MARKUP_CLASS = 'divine-blueprint-full-cover';

  function makeCover() {
    const figure = document.createElement('figure');
    figure.className = MARKUP_CLASS;
    figure.setAttribute('aria-label', 'The Divine Blueprint book cover');
    const img = document.createElement('img');
    img.className = 'divine-blueprint-full-cover-image canonical-book-cover-image';
    img.src = COVER;
    img.alt = ALT;
    img.width = 1024;
    img.height = 1536;
    img.loading = 'eager';
    img.decoding = 'async';
    figure.append(img);
    return figure;
  }

  function isBookCover(img) {
    const identity = [img.src, img.alt, img.className].filter(Boolean).join(' ').toLowerCase();
    return identity.includes('divine-blueprint-cover') ||
      identity.includes('divine blueprint book cover') ||
      identity.includes('hero-book-cover-image') ||
      identity.includes('canonical-book-cover-image') ||
      identity.includes('divine-blueprint-full-cover-image') ||
      /(?:^|[\\s_-])book[\\s_-]*cover(?:$|[\\s_-])/.test(identity);
  }

  function apply() {
    const isCompanion = location.pathname === '/companion' || location.pathname === '/companion/' || location.pathname.endsWith('/companion.html');
    if (isCompanion) {
      document.body.classList.add('companion-page');
      const selectors = ['.companion-cover-visual', '.companion-book-cover-visual', '.journal-visual'];
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((node) => {
          if (!node.classList.contains(MARKUP_CLASS)) node.replaceWith(makeCover());
        });
      }
    }

    document.querySelectorAll('img').forEach((img) => {
      if (!isBookCover(img)) return;
      img.src = COVER;
      img.alt = ALT;
      img.loading = 'eager';
      img.decoding = 'async';
      img.classList.add('canonical-book-cover-image');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
`;
await writeFile(runtimePath, runtime, "utf8");

await processHtml(siteRoot);

const companionHtml = await readFile(join(siteRoot, "companion", "index.html"), "utf8");
if (!companionHtml.includes('class="divine-blueprint-full-cover"')) {
  throw new Error("The Companion page was not converted to the complete book-cover image.");
}
if (companionHtml.includes('class="companion-cover-visual"')) {
  throw new Error("The old Companion cover visual remains in the final page.");
}

console.log("Finalized the full Divine Blueprint cover on the Companion page and all recognized book-cover locations.");
