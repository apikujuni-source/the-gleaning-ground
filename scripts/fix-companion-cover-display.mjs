import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const stylesPath = join(siteRoot, "assets", "styles.css");
const companionPages = [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
];
const canonicalCover = "/assets/divine-blueprint-cover.webp";
const canonicalAlt = "The Divine Blueprint by Ayo-Paul Ikujuni book cover";

function addCompanionBodyClass(html) {
  if (/<body\b[^>]*class=/i.test(html)) {
    return html.replace(/<body\b([^>]*class=(['"])(.*?)\2[^>]*)>/i, (_match, attrs, quote, classes) => {
      const classSet = new Set(classes.split(/\s+/).filter(Boolean));
      classSet.add("companion-page");
      return `<body${attrs.replace(/class=(['"])(.*?)\1/i, `class=${quote}${[...classSet].join(" ")}${quote}`)}>`;
    });
  }
  return html.replace(/<body\b([^>]*)>/i, '<body$1 class="companion-page">');
}

// Replace a balanced DIV—including nested DIVs—when its opening tag contains
// the requested class. This is needed because the old visual is CSS-built,
// not an <img>, so object-fit rules alone cannot prevent the half-cover effect.
function replaceBalancedDivByClass(html, className, replacement) {
  const classPattern = new RegExp(`<div\\b[^>]*class=(['"])[^'"]*\\b${className}\\b[^'"]*\\1[^>]*>`, "i");
  const opening = classPattern.exec(html);
  if (!opening) return html;

  const start = opening.index;
  const tokenPattern = /<div\b[^>]*>|<\/div\s*>/gi;
  tokenPattern.lastIndex = start;
  let depth = 0;
  let token;

  while ((token = tokenPattern.exec(html))) {
    if (/^<div\b/i.test(token[0])) depth += 1;
    else depth -= 1;

    if (depth === 0) {
      return html.slice(0, start) + replacement + html.slice(tokenPattern.lastIndex);
    }
  }

  throw new Error(`Could not find the closing tag for .${className}.`);
}

const fullCoverVisual = `<div class="journal-visual companion-book-cover-visual" aria-label="The Divine Blueprint book cover">
      <img class="canonical-book-cover-image companion-page-book-cover" src="${canonicalCover}" alt="${canonicalAlt}" loading="eager" decoding="async">
    </div>`;

const marker = "/* Companion full-cover display safeguard */";
let styles = await readFile(stylesPath, "utf8");
const safeguardCss = `

${marker}
body.companion-page .companion-book-cover-visual{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:100%!important;
  min-width:0!important;
  min-height:0!important;
  height:auto!important;
  max-height:none!important;
  overflow:visible!important;
  padding:clamp(12px,2vw,28px)!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
}
body.companion-page .companion-page-book-cover{
  display:block!important;
  width:min(390px,100%)!important;
  max-width:100%!important;
  height:auto!important;
  max-height:none!important;
  aspect-ratio:auto!important;
  object-fit:contain!important;
  object-position:center center!important;
  margin:0 auto!important;
  transform:none!important;
  clip-path:none!important;
  overflow:visible!important;
  border-radius:2px!important;
  filter:drop-shadow(18px 24px 28px rgba(7,26,48,.22));
}
body.companion-page .journal-visual.companion-book-cover-visual::before,
body.companion-page .journal-visual.companion-book-cover-visual::after{
  content:none!important;
  display:none!important;
}
body.companion-page .companion-book-cover-visual .open-journal,
body.companion-page .companion-book-cover-visual .closed-journal,
body.companion-page .companion-book-cover-visual .journal-lines{
  display:none!important;
}
@media (max-width:760px){
  body.companion-page .companion-page-book-cover{
    width:min(330px,88vw)!important;
  }
}
`;

if (styles.includes(marker)) {
  const markerIndex = styles.indexOf(marker);
  styles = styles.slice(0, markerIndex).replace(/\s+$/, "") + safeguardCss;
} else {
  styles += safeguardCss;
}
await writeFile(stylesPath, styles, "utf8");

for (const pagePath of companionPages) {
  let html = await readFile(pagePath, "utf8");
  html = addCompanionBodyClass(html);
  html = replaceBalancedDivByClass(html, "journal-visual", fullCoverVisual);
  html = html.replace(/object-fit\s*:\s*cover/gi, "object-fit:contain");
  await writeFile(pagePath, html, "utf8");
}

console.log("Replaced the Companion CSS mockup with the complete canonical book-cover image.");
