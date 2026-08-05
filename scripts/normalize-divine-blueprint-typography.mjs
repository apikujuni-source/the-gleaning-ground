import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = "_site/divine-blueprint-site";
const stylesPath = join(root, "assets", "styles.css");
const reportPath = join(root, "assets", "typography-audit.json");
const auditVersion = "20260805-responsive-type-v1";
const blockStart = "/* RESPONSIVE TYPOGRAPHY AUDIT: START */";
const blockEnd = "/* RESPONSIVE TYPOGRAPHY AUDIT: END */";

if (!existsSync(stylesPath)) {
  throw new Error(`Missing Divine Blueprint stylesheet: ${stylesPath}`);
}

const typographyCss = `${blockStart}
/*
  Site-wide type scale for the Divine Blueprint website.
  The existing serif families, colours, and brand treatments are preserved;
  this layer normalizes only size, line-height, wrapping, and responsive rhythm.
*/
:root{
  --db-type-body:clamp(1rem,.972rem + .14vw,1.075rem);
  --db-type-lead:clamp(1.075rem,1.005rem + .34vw,1.30rem);
  --db-type-h1:clamp(2.25rem,1.48rem + 3.55vw,4.65rem);
  --db-type-h2:clamp(1.70rem,1.34rem + 1.72vw,2.90rem);
  --db-type-h3:clamp(1.25rem,1.12rem + .63vw,1.72rem);
  --db-type-h4:clamp(1.08rem,1.02rem + .28vw,1.30rem);
  --db-type-small:clamp(.875rem,.845rem + .14vw,.95rem);
  --db-type-control:clamp(.95rem,.93rem + .10vw,1rem);
}

html{
  font-size:100%;
  -webkit-text-size-adjust:100%;
  text-size-adjust:100%;
}

body{
  font-size:var(--db-type-body)!important;
  line-height:1.68;
  font-kerning:normal;
  text-rendering:optimizeLegibility;
}

:where(p,li,dd,dt,blockquote,figcaption,label,input,textarea,select,button){
  overflow-wrap:break-word;
}

:where(main p,main li,main dd,main blockquote,article p,article li,.prose p,.prose li){
  line-height:1.72;
}

:where(h1,h2,h3,h4,h5,h6){
  margin-top:0;
  line-height:1.12!important;
  overflow-wrap:anywhere;
  text-wrap:balance;
}

h1,
:where(.hero,.page-hero,.chapter-hero,.companion-hero,.program-hero) h1{
  font-size:var(--db-type-h1)!important;
  line-height:1.02!important;
  letter-spacing:-.024em;
}

h2{
  font-size:var(--db-type-h2)!important;
  line-height:1.10!important;
  letter-spacing:-.014em;
}

h3{
  font-size:var(--db-type-h3)!important;
  line-height:1.18!important;
}

h4{
  font-size:var(--db-type-h4)!important;
  line-height:1.24!important;
}

h5{
  font-size:clamp(1rem,.97rem + .15vw,1.16rem)!important;
  line-height:1.30!important;
}

h6{
  font-size:clamp(.95rem,.93rem + .10vw,1.05rem)!important;
  line-height:1.34!important;
}

:where(.hero-copy,.hero-text,.hero-content,.page-intro,.intro,.lede,.lead,.section-intro,.companion-hero) > p,
:where(.hero,.page-hero,.chapter-hero,.companion-hero,.program-hero) p{
  font-size:var(--db-type-lead)!important;
  line-height:1.60!important;
}

:where(nav a,header a,header button,.nav-link,.menu-link,.dropdown a,.button,.btn,button,input,textarea,select){
  font-size:var(--db-type-control)!important;
  line-height:1.30;
}

:where(button,.button,.btn,input,textarea,select){
  min-font-size:16px;
}

:where(small,.small,.eyebrow,.kicker,.overline,.meta,.metadata,.caption,.legal,.helper-text,.form-note,.disclaimer,.privacy-note,.card-label,.section-label){
  font-size:var(--db-type-small)!important;
  line-height:1.48!important;
}

:where(.card,.chapter-card,.resource-card,.study-card,.teaching-card,.edition-card,.feature-card,.program-card) p,
:where(.card,.chapter-card,.resource-card,.study-card,.teaching-card,.edition-card,.feature-card,.program-card) li{
  font-size:clamp(.975rem,.955rem + .10vw,1.045rem)!important;
  line-height:1.66!important;
}

:where(.stat-number,.metric-value,.number-value,.assessment-score){
  font-size:clamp(1.55rem,1.33rem + 1.08vw,2.35rem)!important;
  line-height:1!important;
}

:where(.chapter-number,.step-number,.rhythm-number,.module-number){
  font-size:clamp(1.12rem,1.02rem + .48vw,1.50rem)!important;
  line-height:1!important;
}

blockquote{
  font-size:clamp(1.05rem,1rem + .24vw,1.22rem)!important;
  line-height:1.62!important;
}

:where(table){
  font-size:clamp(.925rem,.90rem + .12vw,1rem)!important;
  line-height:1.45;
}

:where(th){
  font-size:clamp(.875rem,.85rem + .12vw,.95rem)!important;
  line-height:1.35;
}

footer{
  font-size:clamp(.925rem,.90rem + .12vw,1rem)!important;
  line-height:1.58;
}

footer :where(h2,h3,h4){
  font-size:clamp(1rem,.96rem + .20vw,1.16rem)!important;
  line-height:1.25!important;
  letter-spacing:.02em;
}

footer :where(a,p,li,small){
  font-size:inherit!important;
  line-height:1.58!important;
}

:where(.modal,.dialog,[role="dialog"]) h2{
  font-size:clamp(1.55rem,1.34rem + 1vw,2.20rem)!important;
}

:where(.modal,.dialog,[role="dialog"]) p,
:where(.modal,.dialog,[role="dialog"]) li{
  font-size:clamp(.975rem,.95rem + .12vw,1.05rem)!important;
  line-height:1.62!important;
}

@media (max-width:767px){
  :root{
    --db-type-body:1rem;
    --db-type-lead:clamp(1.025rem,.97rem + .28vw,1.12rem);
    --db-type-h1:clamp(2rem,1.48rem + 5.20vw,3.20rem);
    --db-type-h2:clamp(1.55rem,1.30rem + 2.50vw,2.15rem);
    --db-type-h3:clamp(1.20rem,1.11rem + .90vw,1.48rem);
    --db-type-h4:clamp(1.05rem,1.01rem + .40vw,1.20rem);
    --db-type-control:1rem;
  }

  body{
    line-height:1.66;
  }

  :where(main p,main li,main dd,article p,article li,.prose p,.prose li){
    line-height:1.68;
  }

  :where(nav a,header a,header button,.nav-link,.menu-link,.dropdown a){
    font-size:1rem!important;
    line-height:1.35!important;
  }

  :where(button,.button,.btn,input,select){
    min-height:44px;
  }

  textarea{
    min-height:112px;
  }

  footer{
    font-size:.95rem!important;
  }
}

@media (max-width:390px){
  :root{
    --db-type-h1:clamp(1.90rem,1.38rem + 5.35vw,2.70rem);
    --db-type-h2:clamp(1.48rem,1.24rem + 2.45vw,1.92rem);
  }

  :where(.button,.btn,button){
    font-size:.96rem!important;
  }
}

@media (min-width:1200px){
  :where(main p,main li,article p,article li,.prose p,.prose li){
    line-height:1.74;
  }
}

@media (prefers-reduced-motion:reduce){
  html{
    scroll-behavior:auto;
  }
}
${blockEnd}`;

function replaceTypographyBlock(css) {
  const escapedStart = blockStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = blockEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g");
  const withoutExisting = css.replace(existing, "").trimEnd();
  return `${withoutExisting}\n\n${typographyCss}\n`;
}

async function findHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files.sort();
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function collectInlineSizes(html) {
  const values = [];
  for (const match of html.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em|vw|vh|%)/gi)) {
    values.push(`${match[1]}${match[2].toLowerCase()}`);
  }
  return [...new Set(values)].sort();
}

let styles = await readFile(stylesPath, "utf8");
styles = replaceTypographyBlock(styles);
await writeFile(stylesPath, styles, "utf8");

const pages = await findHtmlFiles(root);
const report = {
  version: auditVersion,
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  pages: []
};

for (const page of pages) {
  const original = await readFile(page, "utf8");
  let updated = original;

  if (/<html\b/i.test(updated)) {
    updated = updated.replace(/<html\b([^>]*)>/i, (tag, attributes) => {
      if (/\bdata-typography-audit=/i.test(tag)) {
        return tag.replace(/\bdata-typography-audit=(['"])[^'"]*\1/i, `data-typography-audit="${auditVersion}"`);
      }
      return `<html${attributes} data-typography-audit="${auditVersion}">`;
    });
  }

  if (!/<meta\b[^>]*name=(['"])viewport\1/i.test(updated) && /<head\b[^>]*>/i.test(updated)) {
    updated = updated.replace(/<head\b[^>]*>/i, (head) => `${head}\n<meta name="viewport" content="width=device-width, initial-scale=1">`);
  }

  if (updated !== original) await writeFile(page, updated, "utf8");

  report.pages.push({
    path: relative(root, page).replaceAll("\\", "/"),
    headings: {
      h1: countMatches(updated, /<h1\b/gi),
      h2: countMatches(updated, /<h2\b/gi),
      h3: countMatches(updated, /<h3\b/gi),
      h4: countMatches(updated, /<h4\b/gi)
    },
    paragraphs: countMatches(updated, /<p\b/gi),
    listItems: countMatches(updated, /<li\b/gi),
    controls: countMatches(updated, /<(?:button|input|textarea|select)\b/gi),
    inlineFontSizes: collectInlineSizes(updated)
  });
}

if (!pages.length) throw new Error("No Divine Blueprint HTML pages were found for the typography audit.");
if (!styles.includes(blockStart) || !styles.includes(blockEnd)) {
  throw new Error("Responsive typography CSS was not installed correctly.");
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Audited and normalized responsive typography across ${pages.length} Divine Blueprint HTML pages.`);
