import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const siteRoot = resolve("_site");

const adminOnlyPatterns = [
  /\bteachings?\s+(?:are|is)\s+(?:(?:currently|still)\s+)?(?:being\s+)?prepared\b/i,
  /\b(?:published|new|future)\s+(?:teaching|devotional|article|blog|resource|podcast|video|sermon|entry|entries|item|items|post|posts)s?\b[\s\S]{0,220}\b(?:admin|cms)(?:\s+(?:page|panel|dashboard))?\b[\s\S]{0,220}\b(?:appear|display|show)(?:\s+here)?(?:\s+automatically)?\b/i,
  /\b(?:add|publish|manage|edit|create)(?:ed|ing)?\b[\s\S]{0,160}\b(?:through|from|using|via)\b[\s\S]{0,60}\b(?:the\s+)?(?:admin|cms)(?:\s+(?:page|panel|dashboard))?\b/i,
  /\b(?:entries|items|posts|resources|teachings|content)\b[\s\S]{0,160}\b(?:will|would)\b[\s\S]{0,100}\b(?:appear|display|show)\b[\s\S]{0,100}\b(?:automatically|when\s+published|once\s+published|after\s+publication)\b/i,
  /\b(?:placeholder|sample)\s+(?:content|copy|text)\b[\s\S]{0,160}\b(?:admin|cms)\b/i,
  /\b(?:visible|shown|displayed)\s+(?:after|once|when)\b[\s\S]{0,100}\b(?:added|published|created)\b[\s\S]{0,100}\b(?:admin|cms)\b/i,
  /\b(?:content|entries|posts|items|resources|teachings)\s+(?:added|published|created)\s+(?:through|from|using|via)\s+(?:the\s+)?(?:admin|cms)\b/i
];

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function visibleText(fragment) {
  return decodeEntities(
    String(fragment || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function isAdminOnlyText(text) {
  if (!text || text.length > 900) return false;
  return adminOnlyPatterns.some((pattern) => pattern.test(text));
}

function removeMatchingElements(html) {
  let removed = 0;

  const leafBlockPattern = /<(h[1-6]|p|li|small|figcaption|span)\b[^>]*>[\s\S]*?<\/\1>/gi;
  html = html.replace(leafBlockPattern, (element) => {
    if (!isAdminOnlyText(visibleText(element))) return element;
    removed += 1;
    return "";
  });

  const labelledContainerPattern = /<(div|aside|section)\b([^>]*)>[\s\S]*?<\/\1>/gi;
  html = html.replace(labelledContainerPattern, (element, _tag, attributes) => {
    const labelledAsPlaceholder = /(?:class|id)\s*=\s*["'][^"']*(?:empty|placeholder|admin-note|cms-note|editor-note|status-message|content-note)[^"']*["']/i.test(
      attributes
    );
    if (!labelledAsPlaceholder || !isAdminOnlyText(visibleText(element))) return element;
    removed += 1;
    return "";
  });

  const emptyPlaceholderPattern = /<(div|aside|section)\b([^>]*)>\s*<\/\1>/gi;
  html = html.replace(emptyPlaceholderPattern, (element, _tag, attributes) => {
    const labelledAsPlaceholder = /(?:class|id)\s*=\s*["'][^"']*(?:empty|placeholder|admin-note|cms-note|editor-note|status-message|content-note)[^"']*["']/i.test(
      attributes
    );
    return labelledAsPlaceholder ? "" : element;
  });

  return { html, removed };
}

function removeAdminFieldsFromPageData(page) {
  let removed = 0;
  if (!page || typeof page !== "object") return removed;

  for (const section of page.sections || []) {
    if (!Array.isArray(section.textFields)) continue;
    section.textFields = section.textFields.filter((item) => {
      const text = visibleText(item?.value ?? "");
      if (!isAdminOnlyText(text)) return true;
      removed += 1;
      return false;
    });
  }

  return removed;
}

function scrubCmsPageData(html) {
  let removed = 0;
  const pageDataPattern = /<script\b([^>]*\bid=["']cms-page-data["'][^>]*)>([\s\S]*?)<\/script>/gi;

  const cleaned = html.replace(pageDataPattern, (element, attributes, body) => {
    try {
      const page = JSON.parse(body);
      const count = removeAdminFieldsFromPageData(page);
      if (!count) return element;
      removed += count;
      const safeJson = JSON.stringify(page).replace(/</g, "\\u003c");
      return `<script${attributes}>${safeJson}</script>`;
    } catch (error) {
      console.warn("Could not inspect cms-page-data while removing public admin notes:", error);
      return element;
    }
  });

  return { html: cleaned, removed };
}

async function listHtml(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const segments = path.split(sep);
    if (segments.includes("admin")) continue;
    if (entry.isDirectory()) paths.push(...(await listHtml(path)));
    else if (entry.isFile() && entry.name.endsWith(".html")) paths.push(path);
  }
  return paths;
}

if (!existsSync(siteRoot)) {
  throw new Error("The built site was not found. Run this script after the site build.");
}

let filesChanged = 0;
let elementsRemoved = 0;
let runtimeFieldsRemoved = 0;

for (const path of await listHtml(siteRoot)) {
  const original = await readFile(path, "utf8");
  const pageDataResult = scrubCmsPageData(original);
  const elementResult = removeMatchingElements(pageDataResult.html);
  if (elementResult.html === original) continue;
  await writeFile(path, elementResult.html, "utf8");
  filesChanged += 1;
  elementsRemoved += elementResult.removed;
  runtimeFieldsRemoved += pageDataResult.removed;
  console.log(
    `Removed ${elementResult.removed} rendered admin note(s) and ${pageDataResult.removed} CMS runtime field(s) from ${relative(siteRoot, path)}.`
  );
}

console.log(
  `Removed ${elementsRemoved} rendered public admin note(s) and ${runtimeFieldsRemoved} CMS runtime field(s) from ${filesChanged} HTML file(s).`
);
