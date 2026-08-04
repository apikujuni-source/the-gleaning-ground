import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const siteRoot = resolve("_site");

const adminOnlyPatterns = [
  /\bteachings?\s+(?:are|is)\s+(?:(?:currently|still)\s+)?(?:being\s+)?prepared\b/i,
  /\b(?:published|new|future)\s+(?:teaching|devotional|article|blog|resource|podcast|video|sermon|entry|entries|item|items|post|posts)s?\b[\s\S]{0,180}\b(?:admin|cms)(?:\s+(?:page|panel|dashboard))?\b[\s\S]{0,180}\b(?:appear|display|show)(?:\s+here)?(?:\s+automatically)?\b/i,
  /\b(?:add|publish|manage|edit|create)(?:ed|ing)?\b[\s\S]{0,120}\b(?:through|from|using|via)\b[\s\S]{0,40}\b(?:the\s+)?(?:admin|cms)(?:\s+(?:page|panel|dashboard))?\b/i,
  /\b(?:entries|items|posts|resources|teachings|content)\b[\s\S]{0,120}\b(?:will|would)\b[\s\S]{0,80}\b(?:appear|display|show)\b[\s\S]{0,80}\b(?:automatically|when\s+published|once\s+published|after\s+publication)\b/i,
  /\b(?:placeholder|sample)\s+(?:content|copy|text)\b[\s\S]{0,120}\b(?:admin|cms)\b/i,
  /\b(?:visible|shown|displayed)\s+(?:after|once|when)\b[\s\S]{0,80}\b(?:added|published|created)\b[\s\S]{0,80}\b(?:admin|cms)\b/i
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
    fragment
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function isAdminOnlyText(text) {
  if (!text || text.length > 700) return false;
  return adminOnlyPatterns.some((pattern) => pattern.test(text));
}

function removeMatchingElements(html) {
  let removed = 0;

  const leafBlockPattern = /<(h[2-6]|p|li|small|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi;
  html = html.replace(leafBlockPattern, (element) => {
    if (!isAdminOnlyText(visibleText(element))) return element;
    removed += 1;
    return "";
  });

  const labelledContainerPattern = /<(div|aside)\b([^>]*)>[\s\S]*?<\/\1>/gi;
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

for (const path of await listHtml(siteRoot)) {
  const original = await readFile(path, "utf8");
  const result = removeMatchingElements(original);
  if (result.html === original) continue;
  await writeFile(path, result.html, "utf8");
  filesChanged += 1;
  elementsRemoved += result.removed;
  console.log(`Removed ${result.removed} public admin note(s) from ${relative(siteRoot, path)}.`);
}

console.log(
  `Removed ${elementsRemoved} public admin-only note(s) from ${filesChanged} HTML file(s).`
);
