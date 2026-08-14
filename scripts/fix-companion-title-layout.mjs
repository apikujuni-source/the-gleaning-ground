import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const settingsPath = resolve("content/page-settings/divine/companion.json");
const siteRoot = resolve("_site/divine-blueprint-site");
const pagePaths = [join(siteRoot, "companion.html"), join(siteRoot, "companion", "index.html")];
const stylesPath = join(siteRoot, "assets", "styles.css");
const titleText = "More Than a Journal";
const titleMarkerStart = "/* COMPANION SINGLE-LINE TITLE: START */";
const titleMarkerEnd = "/* COMPANION SINGLE-LINE TITLE: END */";

function normalizePageSettings(page) {
  if (!page || typeof page !== "object") return page;

  const firstSection = (page.sections || []).find((section) =>
    (section.textFields || []).some((field) => /\/h1$/.test(String(field.xpath || "")))
  );

  if (firstSection) {
    firstSection.label = titleText;
    for (const field of firstSection.textFields || []) {
      if (!/\/h1$/.test(String(field.xpath || ""))) continue;
      field.label = `Main heading — ${titleText}`;
      field.mode = "text";
      field.value = titleText;
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
      return `<h1${attributes}>${titleText}</h1>`;
    }
  );

  if (!changed) {
    html = html
      .replaceAll("More Than a<br>Journal", titleText)
      .replaceAll("More Than a<br />Journal", titleText)
      .replaceAll("More Than a<br/>Journal", titleText)
      .replaceAll("More Than<br>a Journal", titleText)
      .replaceAll("More Than<br />a Journal", titleText)
      .replaceAll("More Than<br/>a Journal", titleText);
  }

  return html;
}

async function normalizeBuiltPages() {
  for (const path of pagePaths) {
    if (!existsSync(path)) continue;
    let html = await readFile(path, "utf8");
    html = normalizeCmsPageData(normalizeVisibleHeading(html));

    const heading = html.match(/<h1\b[^>]*\bid=["']companion-original-title["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
    if (heading !== titleText) {
      throw new Error(`${path} does not contain the canonical single-line Companion title.`);
    }
    if (/<br\s*\/?\s*>/i.test(heading)) {
      throw new Error(`${path} Companion title still contains a forced line break.`);
    }

    await writeFile(path, html, "utf8");
  }
}

async function installTitleCss() {
  if (!existsSync(stylesPath)) return;
  let css = await readFile(stylesPath, "utf8");

  for (const [start, end] of [
    ["/* COMPANION TWO-LINE TITLE: START */", "/* COMPANION TWO-LINE TITLE: END */"],
    [titleMarkerStart, titleMarkerEnd]
  ]) {
    const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    css = css.replace(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g"), "").trimEnd();
  }

  css += `\n\n${titleMarkerStart}\n.companion-original-grid{grid-template-columns:minmax(0,1.08fr) minmax(300px,.92fr);gap:clamp(40px,5vw,72px)}\n.companion-original-copy #companion-original-title{white-space:nowrap!important;max-width:none!important;width:max-content;max-width:100%!important;font-size:clamp(2.55rem,4.15vw,4.05rem)!important;line-height:1.02!important;letter-spacing:-.04em!important}\n@media(max-width:860px){.companion-original-grid{grid-template-columns:1fr}.companion-original-copy #companion-original-title{width:auto;max-width:100%!important;font-size:clamp(2.3rem,7.4vw,3.65rem)!important}}\n@media(max-width:430px){.companion-original-copy #companion-original-title{font-size:clamp(2rem,9vw,2.35rem)!important;letter-spacing:-.045em!important}}\n${titleMarkerEnd}\n`;
  await writeFile(stylesPath, css, "utf8");
}

await normalizeSettingsFile();
await normalizeBuiltPages();
await installTitleCss();

console.log("Locked the Companion heading to one line: ‘More Than a Journal’. ");
