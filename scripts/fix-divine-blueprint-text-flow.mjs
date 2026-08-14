import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = "_site/divine-blueprint-site";
const stylesPath = join(root, "assets", "styles.css");
const reportPath = join(root, "assets", "text-flow-audit.json");
const auditVersion = "20260814-text-flow-v4";
const blockStart = "/* PROFESSIONAL TEXT FLOW: START */";
const blockEnd = "/* PROFESSIONAL TEXT FLOW: END */";

if (!existsSync(stylesPath)) throw new Error(`Missing Divine Blueprint stylesheet: ${stylesPath}`);

const textFlowCss = `${blockStart}
/*
  Final text-flow refinement.
  The goal is not to force every heading onto one line, but to remove avoidable
  wrapping caused by narrow measures, oversized display type, compact-card
  typography, and desktop padding carried unchanged onto small screens.
*/
:where(h1,h2,h3,h4,h5,h6){
  text-wrap:wrap!important;
  overflow-wrap:normal!important;
  word-break:normal!important;
  line-break:auto!important;
  hyphens:none!important;
  white-space:normal;
  max-width:none!important;
}

h1{max-width:none!important;width:auto}

.section-head{
  width:100%!important;
  max-width:min(1040px,100%)!important;
}

.page-hero .container{
  max-width:1160px!important;
}

.lead{
  max-width:min(850px,100%)!important;
}

/* A slightly tighter display scale prevents short headings from spilling onto
   a new line while keeping the hierarchy strong on large screens. */
@media(min-width:768px){
  :root{
    --db-type-h1:clamp(2.25rem,1.65rem + 2.6vw,3.85rem);
    --db-type-h2:clamp(1.65rem,1.23rem + 1.25vw,2.30rem);
    --db-type-h3:clamp(1.18rem,1.08rem + .40vw,1.42rem);
  }
}

/* Compact cards were one of the remaining sources of awkward two-word wraps.
   Their headings need a denser scale than page or section headings. */
:where(
  .chapter-card,
  .resource-card,
  .feature,
  .feature-card,
  .study-card,
  .teaching-card,
  .edition-card,
  .program-card,
  .companion-preview-grid article,
  .give-copy-benefit-grid article,
  .partner-benefit-grid article,
  .pathway-card,
  .ambassador-step-grid article
) h3{
  font-size:clamp(1.10rem,1.03rem + .28vw,1.28rem)!important;
  line-height:1.20!important;
  letter-spacing:-.008em!important;
}

/* Give five-column Companion preview cards a little more usable text width. */
.companion-preview-grid article{
  padding-left:clamp(1.05rem,1.3vw,1.25rem)!important;
  padding-right:clamp(1.05rem,1.3vw,1.25rem)!important;
}

:where(main p,main li,main dd,main dt,main blockquote,main figcaption,article p,article li,.prose p,.prose li){
  text-wrap:wrap!important;
  word-break:normal!important;
  line-break:auto!important;
  hyphens:none!important;
}

:where(.hero,.page-hero,.chapter-hero,.program-hero,.companion-original-copy,.section-head) :where(h1,h2,h3){
  text-wrap:wrap!important;
  overflow-wrap:normal!important;
  word-break:normal!important;
  max-width:none!important;
}

.companion-original-copy #companion-original-title{
  text-wrap:nowrap!important;
  white-space:nowrap!important;
  overflow-wrap:normal!important;
  word-break:normal!important;
  max-width:100%!important;
}

@media(max-width:767px){
  :root{
    --db-type-h1:clamp(2rem,8.7vw,2.20rem);
    --db-type-h2:clamp(1.50rem,6.8vw,1.75rem);
    --db-type-h3:clamp(1.10rem,4.8vw,1.25rem);
  }

  .section-head{max-width:100%!important}
  .page-hero .container{max-width:100%!important}
  .lead{max-width:100%!important}

  /* The original 2.2rem prose padding left only ~292px of text width on a
     390px phone. This restores useful line length without crowding the card. */
  .prose{
    padding:clamp(1.20rem,5.25vw,1.40rem)!important;
  }

  :where(
    .chapter-card,
    .resource-card,
    .feature,
    .feature-card,
    .study-card,
    .teaching-card,
    .edition-card,
    .program-card,
    .companion-preview-grid article,
    .give-copy-benefit-grid article,
    .partner-benefit-grid article,
    .pathway-card,
    .ambassador-step-grid article
  ) h3{
    font-size:clamp(1.08rem,4.55vw,1.20rem)!important;
    line-height:1.22!important;
  }
}
${blockEnd}`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCssBlock(css) {
  const existing = new RegExp(`${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}`, "g");
  return `${css.replace(existing, "").trimEnd()}\n\n${textFlowCss}\n`;
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

function plainText(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stripForcedBreaks(value = "") {
  return String(value)
    .replace(/\s*<br\s*\/?>\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeVisibleHeadings(html, stats) {
  return html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attributes, inner) => {
    const breakCount = (inner.match(/<br\s*\/?>/gi) || []).length;
    if (!breakCount) return full;
    stats.headingBreaksFound += breakCount;
    stats.headingBreaksRemoved += breakCount;
    return `<h${level}${attributes}>${stripForcedBreaks(inner)}</h${level}>`;
  });
}

function normalizeCmsPageData(html, stats) {
  return html.replace(
    /<script\b([^>]*\bid=["']cms-page-data["'][^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attributes, body) => {
      let page;
      try {
        page = JSON.parse(body);
      } catch {
        return full;
      }

      let changed = false;
      for (const section of page.sections || []) {
        for (const field of section.textFields || []) {
          if (!field || typeof field !== "object") continue;
          const xpath = String(field.xpath || "");
          if (!/\/h[1-6]$/i.test(xpath) || typeof field.value !== "string") continue;

          const breakCount = (field.value.match(/<br\s*\/?>/gi) || []).length;
          if (!breakCount) continue;

          stats.cmsHeadingBreaksFound += breakCount;
          stats.cmsHeadingBreaksRemoved += breakCount;
          field.value = stripForcedBreaks(field.value);
          field.mode = "text";
          if (typeof field.label === "string") field.label = field.label.replace(/\s+/g, " ").trim();
          changed = true;
        }
      }

      if (!changed) return full;
      return `<script${attributes}>${JSON.stringify(page).replace(/</g, "\\u003c")}</script>`;
    }
  );
}

function addAuditMarker(html) {
  return html.replace(/<html\b([^>]*)>/i, (tag, attributes) => {
    if (/\bdata-text-flow-audit=/i.test(tag)) {
      return tag.replace(/\bdata-text-flow-audit=(['"])[^'"]*\1/i, `data-text-flow-audit="${auditVersion}"`);
    }
    return `<html${attributes} data-text-flow-audit="${auditVersion}">`;
  });
}

function findHeadingBreaks(html) {
  const failures = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    if (/<br\s*\/?>/i.test(match[2])) failures.push(plainText(match[2]));
  }
  return failures;
}

let styles = await readFile(stylesPath, "utf8");
styles = replaceCssBlock(styles);
await writeFile(stylesPath, styles, "utf8");

const pages = await findHtmlFiles(root);
if (!pages.length) throw new Error("No Divine Blueprint HTML pages were found for text-flow review.");

const report = {
  version: auditVersion,
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  headingBreaksFound: 0,
  headingBreaksRemoved: 0,
  cmsHeadingBreaksFound: 0,
  cmsHeadingBreaksRemoved: 0,
  widthConstraintsCorrected: [
    "h1 max-width 780px",
    "section-head max-width 760px",
    "page-hero container max-width 900px",
    "lead max-width 650px",
    "mobile prose padding 2.2rem",
    "compact card heading scale"
  ],
  displayScaleAdjusted: true,
  compactHeadingScaleAdjusted: true,
  mobileReadingWidthAdjusted: true,
  pages: []
};

for (const page of pages) {
  const pagePath = relative(root, page).replaceAll("\\", "/");
  const stats = {
    headingBreaksFound: 0,
    headingBreaksRemoved: 0,
    cmsHeadingBreaksFound: 0,
    cmsHeadingBreaksRemoved: 0
  };

  let html = await readFile(page, "utf8");
  html = normalizeVisibleHeadings(html, stats);
  html = normalizeCmsPageData(html, stats);
  html = addAuditMarker(html);

  const remaining = findHeadingBreaks(html);
  if (remaining.length) {
    throw new Error(`${pagePath} still contains forced heading line breaks: ${remaining.join(" | ")}`);
  }

  await writeFile(page, html, "utf8");

  for (const key of ["headingBreaksFound", "headingBreaksRemoved", "cmsHeadingBreaksFound", "cmsHeadingBreaksRemoved"]) {
    report[key] += stats[key];
  }
  report.pages.push({ path: pagePath, ...stats });
}

for (const requiredCss of [
  "max-width:min(1040px,100%)!important",
  "max-width:1160px!important",
  "max-width:min(850px,100%)!important",
  "--db-type-h2:clamp(1.65rem,1.23rem + 1.25vw,2.30rem)",
  "--db-type-h1:clamp(2rem,8.7vw,2.20rem)",
  ".prose{",
  "padding:clamp(1.20rem,5.25vw,1.40rem)!important",
  "compact card"
]) {
  if (!styles.includes(requiredCss)) throw new Error(`Missing professional text-flow correction: ${requiredCss}`);
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `Reviewed ${pages.length} Divine Blueprint pages for text flow; removed ${report.headingBreaksRemoved} forced heading breaks, tightened display and card heading scales, and restored useful mobile reading width.`
);
