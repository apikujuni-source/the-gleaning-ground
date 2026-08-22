import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const configPath = "content/divine-blueprint/purchase.json";
const styleMarker = "/* Divine Blueprint Nigeria Selar Paperback */";
const nigeriaSelarMarker = 'data-nigeria-selar-paperback="true"';

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

const kindleLabel = mode === "preorder" ? "Preorder Kindle eBook ↗" : "Buy Kindle eBook ↗";
const selarLabel = mode === "preorder" ? "Preorder Paperback on Selar ↗" : "Order Paperback on Selar ↗";
const kindleDescription = mode === "preorder"
  ? "Preorder the Kindle edition at the launch price and register for your digital Companion Journal."
  : "Read instantly on Kindle and register for your digital Companion Journal.";
const nigeriaDescription = mode === "preorder"
  ? "Preorder the paperback in Nigeria through Selar, or use WhatsApp for local ordering and delivery assistance."
  : "Order the paperback in Nigeria through Selar, or use WhatsApp for local ordering and delivery assistance.";

const selarAction = `<a class="book-purchase-action book-purchase-action-selar" ${nigeriaSelarMarker} href="${selarUrl}" target="_blank" rel="noopener noreferrer">${selarLabel}</a>`;

const styles = `
<style>
${styleMarker}
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

  // Remove any older Selar/eBook post-processing so the current build has one canonical layout.
  html = html.replace(/\s*<div class="book-purchase-selar" data-selar-purchase="true">[\s\S]*?<\/div>\s*(?=<div class="book-purchase-footer">)/gi, "\n    ");
  html = html.replace(/\s*<div class="book-purchase-nigeria-ebook" data-nigeria-ebook="true">[\s\S]*?<\/div>\s*(?=<\/article>)/gi, "\n      ");
  html = html.replace(/\s*<a class="book-purchase-action book-purchase-action-selar" data-nigeria-selar-paperback="true"[\s\S]*?<\/a>\s*/gi, "\n        ");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Unified eBook Options \*\/[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Selar Purchase Link \*\/[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Nigeria Selar eBook \*\/[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Nigeria Selar Paperback \*\/[\s\S]*?<\/style>/gi, "");

  // Keep the international digital option as Kindle only.
  html = html.replace("<h3>eBook</h3>", "<h3>Kindle eBook</h3>");
  html = html.replace("Preorder the eBook at the launch price on Kindle or Selar and register for your digital Companion Journal.", kindleDescription);
  html = html.replace("Get the eBook on Kindle or Selar and register for your digital Companion Journal.", kindleDescription);
  html = html.replace(
    /<div class="book-purchase-ebook-actions" data-ebook-options="true">[\s\S]*?<\/div>/gi,
    `<a class="book-purchase-action book-purchase-action-gold" href="${kindleUrl}" target="_blank" rel="noopener noreferrer">${kindleLabel}</a>`
  );
  html = html.replace(/>Preorder on Kindle ↗<\/a>/gi, `>${kindleLabel}</a>`);
  html = html.replace(/>Buy on Kindle ↗<\/a>/gi, `>${kindleLabel}</a>`);

  // Nigeria is paperback only. Selar is an order channel for that paperback.
  const nigeriaArticlePattern = /(<article class="book-purchase-card">\s*<span class="book-purchase-region">Nigeria<\/span>)([\s\S]*?)(<\/article>)/i;
  const nigeriaMatch = html.match(nigeriaArticlePattern);
  if (!nigeriaMatch) {
    throw new Error(`Could not locate the Nigeria purchase card in ${page}.`);
  }

  let nigeriaBody = nigeriaMatch[2];
  nigeriaBody = nigeriaBody.replace("<h3>Paperback &amp; eBook</h3>", "<h3>Paperback</h3>");
  nigeriaBody = nigeriaBody.replace("<h3>Paperback & eBook</h3>", "<h3>Paperback</h3>");
  nigeriaBody = nigeriaBody.replace(
    "Choose paperback for local delivery or the eBook for instant digital access in Nigeria.",
    nigeriaDescription
  );
  nigeriaBody = nigeriaBody.replace(
    "Preorder directly for local payment and delivery coordination at the reduced preorder price.",
    nigeriaDescription
  );
  nigeriaBody = nigeriaBody.replace(
    "Order directly for local payment and delivery coordination.",
    nigeriaDescription
  );

  const whatsappActionPattern = /(<a class="book-purchase-action book-purchase-action-whatsapp"[^>]*>)/i;
  if (!whatsappActionPattern.test(nigeriaBody)) {
    throw new Error(`Could not locate the Nigeria WhatsApp order action in ${page}.`);
  }
  nigeriaBody = nigeriaBody.replace(whatsappActionPattern, `${selarAction}\n        $1`);
  html = html.replace(nigeriaArticlePattern, `$1${nigeriaBody}$3`);

  html = html.replace("</head>", `${styles}\n</head>`);

  const finalNigeria = html.match(nigeriaArticlePattern)?.[0] || "";
  const selarOccurrences = html.split(selarUrl).length - 1;

  if (
    !html.includes("<h3>Kindle eBook</h3>") ||
    !html.includes(kindleUrl) ||
    !html.includes(kindleLabel) ||
    !finalNigeria.includes("<h3>Paperback</h3>") ||
    !finalNigeria.includes(nigeriaSelarMarker) ||
    !finalNigeria.includes(selarUrl) ||
    !finalNigeria.includes(selarLabel) ||
    finalNigeria.includes("eBook") ||
    finalNigeria.includes("digital edition") ||
    html.includes("<h3>Paperback &amp; eBook</h3>") ||
    html.includes('data-nigeria-ebook="true"') ||
    html.includes('data-ebook-options="true"') ||
    html.includes('data-selar-purchase="true"') ||
    selarOccurrences !== 1
  ) {
    throw new Error(`Nigeria paperback-only Selar placement did not verify in ${page}.`);
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
    "SELAR_REGION=NIGERIA_ONLY",
    "SELAR_PRODUCT=PAPERBACK",
    "INTERNATIONAL_EBOOK=KINDLE",
    "NIGERIA_FORMAT=PAPERBACK_ONLY",
    `MODE=${mode}`,
    `KINDLE_URL=${kindleUrl}`,
    `SELAR_URL=${selarUrl}`,
    `NIGERIA_PAPERBACK_PRICE=${config.paperbackPriceNigeria}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Kept Kindle eBook international and configured Selar as a Nigeria paperback order channel across ${updatedPages} Divine Blueprint storefront page(s).`);
