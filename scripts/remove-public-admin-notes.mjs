import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import {
  adminOnlyRegexSources,
  exactAdminFragments,
  isAdminOnlyText,
  normalizeText,
  visibleText
} from "./admin-note-policy.mjs";

const siteRoot = resolve("_site");
const guardId = "public-admin-note-guard";

function scrubValue(value, stats) {
  if (typeof value === "string") {
    if (!isAdminOnlyText(value)) return value;
    stats.stringsRemoved += 1;
    return "";
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return true;
        const candidate = item.value ?? item.text ?? item.title ?? item.description ?? item.message;
        if (typeof candidate !== "string" || !isAdminOnlyText(candidate)) return true;
        stats.fieldsRemoved += 1;
        return false;
      })
      .map((item) => scrubValue(item, stats));
  }
  if (value && typeof value === "object") {
    const cleaned = {};
    for (const [key, child] of Object.entries(value)) cleaned[key] = scrubValue(child, stats);
    return cleaned;
  }
  return value;
}

function scrubCmsPageData(html) {
  const stats = { fieldsRemoved: 0, stringsRemoved: 0 };
  const pattern = /<script\b([^>]*\bid=["']cms-page-data["'][^>]*)>([\s\S]*?)<\/script>/gi;
  const cleaned = html.replace(pattern, (element, attributes, body) => {
    try {
      const page = JSON.parse(body);
      const scrubbed = scrubValue(page, stats);
      const safeJson = JSON.stringify(scrubbed).replace(/</g, "\\u003c");
      return `<script${attributes}>${safeJson}</script>`;
    } catch (error) {
      throw new Error(`Could not inspect cms-page-data: ${error.message}`);
    }
  });
  return { html: cleaned, ...stats };
}

function removeAdminElements(html) {
  let removed = 0;
  const tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "small", "figcaption", "li", "span", "div", "aside", "section"];

  for (const tag of tags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    let previous;
    do {
      previous = html;
      html = html.replace(pattern, (element) => {
        const text = visibleText(element);
        if (!isAdminOnlyText(text)) return element;
        if (["div", "aside", "section"].includes(tag) && text.length > 1200) return element;
        removed += 1;
        return "";
      });
    } while (html !== previous);
  }

  return { html, removed };
}

function removeLooseText(html) {
  let removed = 0;
  const cleaned = html.replace(/>([^<>]+)</g, (match, text) => {
    if (!isAdminOnlyText(text)) return match;
    removed += 1;
    return "><";
  });
  return { html: cleaned, removed };
}

function buildGuardScript() {
  const fragments = JSON.stringify(exactAdminFragments);
  const regexSources = JSON.stringify(adminOnlyRegexSources);
  return `<script id="${guardId}">(() => {
  const fragments = ${fragments};
  const patterns = ${regexSources}.map((source) => new RegExp(source, "i"));
  const normalize = (value) => String(value || "")
    .toLowerCase()
    .replace(/[\\u2018\\u2019]/g, "'")
    .replace(/[\\u2013\\u2014]/g, "-")
    .replace(/[^a-z0-9@._'/-]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
  const isAdminNote = (value) => {
    const text = String(value || "").replace(/\\s+/g, " ").trim();
    if (!text) return false;
    const normalized = normalize(text);
    if (fragments.some((fragment) => normalized.includes(fragment))) return true;
    if (text.length > 1200) return false;
    return patterns.some((pattern) => pattern.test(text));
  };
  const selectors = "h1,h2,h3,h4,h5,h6,p,small,figcaption,li,span,div,aside,section";
  let cleaning = false;
  const clean = (root = document) => {
    if (cleaning) return;
    cleaning = true;
    try {
      const elements = Array.from(root.querySelectorAll ? root.querySelectorAll(selectors) : []);
      elements.sort((a, b) => b.querySelectorAll("*").length - a.querySelectorAll("*").length);
      for (const element of elements) {
        if (!element.isConnected || element.closest("#${guardId}")) continue;
        const text = element.textContent || "";
        if (!isAdminNote(text)) continue;
        if (["DIV", "ASIDE", "SECTION"].includes(element.tagName) && text.length > 1200) continue;
        element.remove();
      }
      const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (!node.parentElement || node.parentElement.closest("#${guardId},script,style,noscript")) continue;
        if (isAdminNote(node.nodeValue)) node.remove();
      }
    } finally {
      cleaning = false;
    }
  };
  const start = () => {
    clean(document);
    const target = document.body || document.documentElement;
    new MutationObserver(() => clean(document)).observe(target, {
      subtree: true,
      childList: true,
      characterData: true
    });
    requestAnimationFrame(() => clean(document));
    setTimeout(() => clean(document), 0);
    setTimeout(() => clean(document), 250);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();</script>`;
}

function injectGuard(html) {
  const existing = new RegExp(`<script\\b[^>]*\\bid=["']${guardId}["'][^>]*>[\\s\\S]*?<\\/script>`, "gi");
  html = html.replace(existing, "");
  const guard = buildGuardScript();
  const bodyOpen = /<body\b[^>]*>/i;
  if (bodyOpen.test(html)) return html.replace(bodyOpen, (tag) => `${tag}\n${guard}`);
  return `${guard}\n${html}`;
}

function assertClean(path, html) {
  const withoutGuard = html.replace(
    new RegExp(`<script\\b[^>]*\\bid=["']${guardId}["'][^>]*>[\\s\\S]*?<\\/script>`, "gi"),
    ""
  );
  const pageData = withoutGuard.match(/<script\b[^>]*\bid=["']cms-page-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (pageData) {
    const parsed = JSON.parse(pageData[1]);
    const inspect = JSON.stringify(parsed);
    if (isAdminOnlyText(inspect) || exactAdminFragments.some((fragment) => normalizeText(inspect).includes(fragment))) {
      throw new Error(`Admin-only text remains in cms-page-data for ${relative(siteRoot, path)}.`);
    }
  }

  const textSegments = [];
  withoutGuard.replace(/>([^<>]+)</g, (_match, text) => {
    if (text.trim()) textSegments.push(text);
    return _match;
  });
  const offending = textSegments.find((text) => isAdminOnlyText(text));
  if (offending) {
    throw new Error(
      `Admin-only text remains in ${relative(siteRoot, path)}: ${visibleText(offending).slice(0, 180)}`
    );
  }
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

if (!existsSync(siteRoot)) throw new Error("The built site was not found. Run this script after the site build.");

let filesChanged = 0;
let renderedRemoved = 0;
let runtimeFieldsRemoved = 0;
let runtimeStringsRemoved = 0;

for (const path of await listHtml(siteRoot)) {
  const original = await readFile(path, "utf8");
  const pageData = scrubCmsPageData(original);
  const elements = removeAdminElements(pageData.html);
  const loose = removeLooseText(elements.html);
  const output = injectGuard(loose.html);
  assertClean(path, output);
  if (output === original) continue;
  await writeFile(path, output, "utf8");
  filesChanged += 1;
  renderedRemoved += elements.removed + loose.removed;
  runtimeFieldsRemoved += pageData.fieldsRemoved;
  runtimeStringsRemoved += pageData.stringsRemoved;
  console.log(
    `Hardened ${relative(siteRoot, path)}: removed ${elements.removed + loose.removed} rendered note(s), ${pageData.fieldsRemoved} CMS field(s), and ${pageData.stringsRemoved} CMS string(s).`
  );
}

console.log(
  `Admin-note hardening complete across ${filesChanged} public HTML file(s): ${renderedRemoved} rendered note(s), ${runtimeFieldsRemoved} CMS field(s), ${runtimeStringsRemoved} CMS string(s). Runtime re-insertion guard installed and static verification passed.`
);
