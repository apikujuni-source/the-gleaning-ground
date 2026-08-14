import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = "_site/divine-blueprint-site";
const stylesPath = join(root, "assets", "styles.css");
const reportPath = join(root, "assets", "text-flow-audit.json");
const auditVersion = "20260814-text-flow-v2";
const blockStart = "/* PROFESSIONAL TEXT FLOW: START */";
const blockEnd = "/* PROFESSIONAL TEXT FLOW: END */";

if (!existsSync(stylesPath)) throw new Error(`Missing Divine Blueprint stylesheet: ${stylesPath}`);

const textFlowCss = `${blockStart}
/*
  Natural text flow across the Divine Blueprint site.
  Prevent balanced/forced wrapping from creating premature line breaks,
  while preserving the intentionally requested two-line Companion title.
*/
:where(h1,h2,h3,h4,h5,h6){
  text-wrap:wrap!important;
  overflow-wrap:normal!important;
  word-break:normal!important;
  line-break:auto!important;
  hyphens:none!important;
  white-space:normal;
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
}

.companion-original-copy #companion-original-title{
  text-wrap:wrap!important;
  overflow-wrap:normal!important;
  word-break:normal!important;
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

function isCompanionPath(pagePath) {
  return pagePath === "companion.html" || pagePath === "companion/index.html";
}

function isApprovedCompanionHeading(value, pagePath) {
  return isCompanionPath(pagePath) && plainText(value).toLowerCase() === "more than a journal";
}

function normalizeVisibleHeadings(html, pagePath, stats) {
  return html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attributes, inner) => {
    const breakCount = (inner.match(/<br\s*\/?>/gi) || []).length;
    if (!breakCount) return full;

    stats.headingBreaksFound += breakCount;
    if (isApprovedCompanionHeading(inner, pagePath)) {
      stats.intentionalBreaksKept += 1;
      return `<h${level}${attributes}>More Than<br>a Journal</h${level}>`;
    }

    stats.headingBreaksRemoved += breakCount;
    return `<h${level}${attributes}>${stripForcedBreaks(inner)}</h${level}>`;
  });
}

function normalizeCmsPageData(html, pagePath, stats) {
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
          const isHeadingField = /\/h[1-6]$/i.test(xpath);
          if (!isHeadingField || typeof field.value !== "string") continue;

          const breakCount = (field.value.match(/<br\s*\/?>/gi) || []).length;
          if (!breakCount) continue;

          stats.cmsHeadingBreaksFound += breakCount;
          if (isApprovedCompanionHeading(field.value, pagePath)) {
            if (field.value !== "More Than<br>a Journal") {
              field.value = "More Than<br>a Journal";
              changed = true;
            }
            stats.cmsIntentionalBreaksKept += 1;
            continue;
          }

          field.value = stripForcedBreaks(field.value);
          if (typeof field.label === "string") field.label = field.label.replace(/\s+/g, " ").trim();
          stats.cmsHeadingBreaksRemoved += breakCount;
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

function findUnapprovedHeadingBreaks(html, pagePath) {
  const failures = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const inner = match[2];
    if (!/<br\s*\/?>/i.test(inner)) continue;
    if (isApprovedCompanionHeading(inner, pagePath)) continue;
    failures.push(plainText(inner));
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
  intentionalBreaksKept: 0,
  cmsHeadingBreaksFound: 0,
  cmsHeadingBreaksRemoved: 0,
  cmsIntentionalBreaksKept: 0,
  pages: []
};

for (const page of pages) {
  const pagePath = relative(root, page).replaceAll("\\", "/");
  const stats = {
    headingBreaksFound: 0,
    headingBreaksRemoved: 0,
    intentionalBreaksKept: 0,
    cmsHeadingBreaksFound: 0,
    cmsHeadingBreaksRemoved: 0,
    cmsIntentionalBreaksKept: 0
  };

  let html = await readFile(page, "utf8");
  html = normalizeVisibleHeadings(html, pagePath, stats);
  html = normalizeCmsPageData(html, pagePath, stats);
  html = addAuditMarker(html);

  const remaining = findUnapprovedHeadingBreaks(html, pagePath);
  if (remaining.length) {
    throw new Error(`${pagePath} still contains forced heading line breaks: ${remaining.join(" | ")}`);
  }

  await writeFile(page, html, "utf8");

  for (const key of [
    "headingBreaksFound",
    "headingBreaksRemoved",
    "intentionalBreaksKept",
    "cmsHeadingBreaksFound",
    "cmsHeadingBreaksRemoved",
    "cmsIntentionalBreaksKept"
  ]) report[key] += stats[key];

  report.pages.push({ path: pagePath, ...stats });
}

if (!styles.includes(blockStart) || !styles.includes("text-wrap:wrap!important")) {
  throw new Error("Professional text-flow CSS was not installed correctly.");
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `Reviewed ${pages.length} Divine Blueprint pages for text flow; removed ${report.headingBreaksRemoved} visible forced heading breaks and ${report.cmsHeadingBreaksRemoved} CMS/runtime heading breaks. Preserved only the approved two-line Companion title.`
);
