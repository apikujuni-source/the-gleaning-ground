import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const configPath = "content/divine-blueprint/purchase.json";
const styleMarker = "/* Divine Blueprint Unified eBook Options */";
const oldStyleMarker = "/* Divine Blueprint Selar Purchase Link */";
const optionsMarker = 'data-ebook-options="true"';

const config = JSON.parse(await readFile(configPath, "utf8"));
const selarUrl = String(config.selarUrl || "").trim();
const kindleUrl = String(config.amazonKindleUrl || "").trim();
const mode = String(config.mode || "standard").trim().toLowerCase();

if (!/^https:\/\/selar\.com\//i.test(selarUrl)) {
  throw new Error(`Invalid or missing Selar URL in ${configPath}: ${selarUrl}`);
}
if (!/^https:\/\//i.test(kindleUrl)) {
  throw new Error(`Invalid or missing Kindle URL in ${configPath}: ${kindleUrl}`);
}

const kindleLabel = mode === "preorder" ? "Preorder on Kindle ↗" : "Buy on Kindle ↗";
const selarLabel = mode === "preorder" ? "Preorder on Selar ↗" : "Buy on Selar ↗";
const ebookDescription = mode === "preorder"
  ? "Preorder the eBook at the launch price on Kindle or Selar and register for your digital Companion Journal."
  : "Get the eBook on Kindle or Selar and register for your digital Companion Journal.";

const actions = `<div class="book-purchase-ebook-actions" ${optionsMarker}>
          <a class="book-purchase-action book-purchase-action-gold" href="${kindleUrl}" target="_blank" rel="noopener noreferrer">${kindleLabel}</a>
          <a class="book-purchase-action book-purchase-action-selar" href="${selarUrl}" target="_blank" rel="noopener noreferrer">${selarLabel}</a>
        </div>`;

const styles = `
<style>
${styleMarker}
.book-purchase-ebook-actions{display:grid;gap:10px;width:100%;margin-top:auto}
.book-purchase-ebook-actions .book-purchase-action{margin-top:0}
.book-purchase-action-selar{background:#8050b8}
.book-purchase-action-selar:hover,.book-purchase-action-selar:focus-visible{background:#6b409e}
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

  // Remove the older standalone Selar callout if it is present in cached/generated source.
  html = html.replace(/\s*<div class="book-purchase-selar" data-selar-purchase="true">[\s\S]*?<\/div>\s*(?=<div class="book-purchase-footer">)/gi, "\n    ");
  html = html.replace(new RegExp(`\\s*<style>\\s*\\/\\* ${oldStyleMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\*\\/[\\s\\S]*?<\\/style>`, "gi"), "");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Unified eBook Options \*\/[\s\S]*?<\/style>/gi, "");

  html = html.replace("<h3>Kindle eBook</h3>", "<h3>eBook</h3>");
  html = html.replace("Read instantly on Kindle and register for your digital Companion Journal.", ebookDescription);
  html = html.replace("Preorder the Kindle edition at the launch price and register for your digital Companion Journal.", ebookDescription);

  html = html.replace(/<div class="book-purchase-ebook-actions" data-ebook-options="true">[\s\S]*?<\/div>/gi, actions);

  if (!html.includes(optionsMarker)) {
    const kindleActionPattern = new RegExp(
      `<a class="book-purchase-action book-purchase-action-gold" href="${kindleUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" target="_blank" rel="noopener noreferrer">(?:Buy Kindle eBook ↗|Preorder Kindle eBook ↗|Buy on Kindle ↗|Preorder on Kindle ↗)<\\/a>`,
      "i"
    );
    if (!kindleActionPattern.test(html)) {
      throw new Error(`Could not locate the Kindle eBook action in ${page}.`);
    }
    html = html.replace(kindleActionPattern, actions);
  }

  html = html.replace("</head>", `${styles}\n</head>`);

  if (
    !html.includes("<h3>eBook</h3>") ||
    html.includes("<h3>Kindle eBook</h3>") ||
    !html.includes(optionsMarker) ||
    !html.includes(kindleUrl) ||
    !html.includes(selarUrl) ||
    !html.includes(kindleLabel) ||
    !html.includes(selarLabel) ||
    html.includes('data-selar-purchase="true"')
  ) {
    throw new Error(`Unified eBook purchase options did not verify in ${page}.`);
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
    "EBOOK_OPTIONS=KINDLE_AND_SELAR",
    `MODE=${mode}`,
    `KINDLE_URL=${kindleUrl}`,
    `SELAR_URL=${selarUrl}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Unified Kindle and Selar under the eBook purchase option across ${updatedPages} Divine Blueprint storefront page(s).`);
