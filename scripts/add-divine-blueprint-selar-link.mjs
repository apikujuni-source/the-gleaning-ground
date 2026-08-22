import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const configPath = "content/divine-blueprint/purchase.json";
const styleMarker = "/* Divine Blueprint Selar Purchase Link */";
const calloutMarker = 'data-selar-purchase="true"';

const config = JSON.parse(await readFile(configPath, "utf8"));
const selarUrl = String(config.selarUrl || "").trim();
const mode = String(config.mode || "standard").trim().toLowerCase();

if (!/^https:\/\/selar\.com\//i.test(selarUrl)) {
  throw new Error(`Invalid or missing Selar URL in ${configPath}: ${selarUrl}`);
}

const actionLabel = mode === "preorder" ? "Preorder eBook on Selar ↗" : "Buy eBook on Selar ↗";
const description = mode === "preorder"
  ? "Prefer Selar? Reserve the digital edition securely through Selar."
  : "Prefer Selar? Get the digital edition securely through Selar.";

const callout = `
    <div class="book-purchase-selar" ${calloutMarker}>
      <div>
        <strong>Digital eBook on Selar</strong>
        <p>${description}</p>
      </div>
      <a class="book-purchase-action book-purchase-action-gold book-purchase-selar-action" href="${selarUrl}" target="_blank" rel="noopener noreferrer">${actionLabel}</a>
    </div>`;

const styles = `
<style>
${styleMarker}
.book-purchase-selar{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-top:20px;padding:20px 22px;border:1px solid rgba(185,135,44,.35);border-radius:14px;background:linear-gradient(135deg,#fff9ec,#fff)}
.book-purchase-selar strong{display:block;color:#0e2d4d;font-size:1.05rem}
.book-purchase-selar p{margin:.35rem 0 0;color:#5b6671;line-height:1.5}
.book-purchase-selar-action{width:auto;min-width:220px;margin-top:0;flex:0 0 auto}
@media(max-width:700px){.book-purchase-selar{align-items:flex-start;flex-direction:column}.book-purchase-selar-action{width:100%;min-width:0}}
</style>`;

async function findHtmlFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

const pages = await findHtmlFiles(siteRoot);
let updatedPages = 0;
let storefrontPages = 0;

for (const page of pages) {
  let html = await readFile(page, "utf8");
  if (!html.includes('id="book-purchase-modal"')) continue;
  storefrontPages += 1;

  html = html.replace(/\s*<div class="book-purchase-selar" data-selar-purchase="true">[\s\S]*?<\/div>\s*(?=<div class="book-purchase-footer">)/gi, "\n    ");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Selar Purchase Link \*\/[\s\S]*?<\/style>/gi, "");

  const insertionPoint = '<div class="book-purchase-footer">';
  if (!html.includes(insertionPoint)) {
    throw new Error(`Could not locate the purchase footer in ${page}.`);
  }

  html = html.replace(insertionPoint, `${callout}\n\n    ${insertionPoint}`);
  html = html.replace("</head>", `${styles}\n</head>`);

  if (!html.includes(selarUrl) || !html.includes(actionLabel)) {
    throw new Error(`Selar purchase link was not installed correctly in ${page}.`);
  }

  await writeFile(page, html, "utf8");
  updatedPages += 1;
}

if (storefrontPages === 0 || updatedPages !== storefrontPages) {
  throw new Error(`Expected to update all storefront pages, found ${storefrontPages} and updated ${updatedPages}.`);
}

await writeFile(
  join(siteRoot, "selar-purchase-status.txt"),
  [
    "SELAR_PURCHASE_LINK=ACTIVE",
    `MODE=${mode}`,
    `URL=${selarUrl}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Added the Selar eBook purchase link to ${updatedPages} Divine Blueprint storefront page(s).`);
