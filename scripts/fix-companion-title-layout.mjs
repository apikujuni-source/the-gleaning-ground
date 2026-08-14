import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const settingsPath = resolve("content/page-settings/divine/companion.json");
const siteRoot = resolve("_site/divine-blueprint-site");
const pagePaths = [join(siteRoot, "companion.html"), join(siteRoot, "companion", "index.html")];
const stylesPath = join(siteRoot, "assets", "styles.css");
const titleHtml = "More Than<br>a Journal";
const titleMarkerStart = "/* COMPANION TWO-LINE TITLE: START */";
const titleMarkerEnd = "/* COMPANION TWO-LINE TITLE: END */";

function normalizePageSettings(page) {
  if (!page || typeof page !== "object") return page;

  const firstSection = (page.sections || []).find((section) =>
    (section.textFields || []).some((field) => /\/h1$/.test(String(field.xpath || "")))
  );

  if (firstSection) {
    firstSection.label = "More Than a Journal";
    for (const field of firstSection.textFields || []) {
      if (!/\/h1$/.test(String(field.xpath || ""))) continue;
      field.label = "Main heading — More Than / a Journal";
      field.mode = "html";
      field.value = titleHtml;
    }
  }

  return page;
}

async function normalizeSettingsFile() {
  if (!existsSync(settingsPath)) return;
  const page = normalizePageSettings(JSON.parse(await readFile(settingsPath, "utf8")));
  await writeFile(settingsPath, `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

function normalizeCmsPageData(html) {
  return html.replace(
    /<script\b([^>]*\bid=["']cms-page-data["'][^>]*)>([\s\S]*?)<\/script>/gi,
    (_element, attributes, body) => {
      const page = normalizePageSettings(JSON.parse(body));
      return `<script${attributes}>${JSON.stringify(page).replaceAll("<", "\\u003c")}</script>`;
    }
  );
}

function normalizeVisibleHeading(html) {
  let changed = false;
  html = html.replace(
    /<h1\b([^>]*\bid=["']companion-original-title["'][^>]*)>[\s\S]*?<\/h1>/i,
    (_match, attributes) => {
      changed = true;
      return `<h1${attributes}>${titleHtml}</h1>`;
    }
  );

  if (!changed) {
    html = html
      .replaceAll("More Than a<br>Journal", titleHtml)
      .replaceAll("More Than a<br />Journal", titleHtml)
      .replaceAll("More Than a<br/>Journal", titleHtml);
  }

  return html;
}

async function normalizeBuiltPages() {
  for (const path of pagePaths) {
    if (!existsSync(path)) continue;
    let html = await readFile(path, "utf8");
    html = normalizeCmsPageData(normalizeVisibleHeading(html));

    const heading = html.match(/<h1\b[^>]*\bid=["']companion-original-title["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
    if (heading !== titleHtml) {
      throw new Error(`${path} does not contain the canonical two-line Companion title.`);
    }
    if ((heading.match(/<br\s*\/?\s*>/gi) || []).length !== 1) {
      throw new Error(`${path} Companion title must contain exactly one explicit line break.`);
    }

    await writeFile(path, html, "utf8");
  }
}

async function installTitleCss() {
  if (!existsSync(stylesPath)) return;
  let css = await readFile(stylesPath, "utf8");
  const escapedStart = titleMarkerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = titleMarkerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  css = css.replace(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g"), "").trimEnd();
  css += `\n\n${titleMarkerStart}\n.companion-original-copy h1{white-space:nowrap}\n${titleMarkerEnd}\n`;
  await writeFile(stylesPath, css, "utf8");
}

await normalizeSettingsFile();
await normalizeBuiltPages();
await installTitleCss();

console.log("Locked the Companion heading to two lines: ‘More Than’ / ‘a Journal’. ");
