import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const configPath = "content/divine-blueprint/purchase.json";
const styleMarker = "/* Divine Blueprint Nigeria Selar eBook */";
const oldUnifiedMarker = "/* Divine Blueprint Unified eBook Options */";
const oldSelarMarker = "/* Divine Blueprint Selar Purchase Link */";
const nigeriaMarker = 'data-nigeria-ebook="true"';

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
const selarLabel = mode === "preorder" ? "Preorder eBook on Selar ↗" : "Buy eBook on Selar ↗";
const nigeriaEbookPrice = mode === "preorder"
  ? String(config.digitalPreorderPriceNigeria || "").trim()
  : String(config.digitalRegularPriceNigeria || config.digitalPreorderPriceNigeria || "").trim();
const nigeriaEbookRegular = String(config.digitalRegularPriceNigeria || "").trim();
const nigeriaEbookSavings = String(config.digitalSavingsNigeria || "").trim();

if (!nigeriaEbookPrice) {
  throw new Error(`Missing Nigeria digital price in ${configPath}.`);
}

const kindleDescription = mode === "preorder"
  ? "Preorder the Kindle edition at the launch price and register for your digital Companion Journal."
  : "Read instantly on Kindle and register for your digital Companion Journal.";

const nigeriaEbookBlock = `<div class="book-purchase-nigeria-ebook" ${nigeriaMarker}>
          <span class="book-purchase-format-label">eBook</span>
          ${mode === "preorder" && nigeriaEbookRegular ? `<div class="book-purchase-nigeria-ebook-pricing"><span>Preorder ${nigeriaEbookPrice}</span><small>Regular ${nigeriaEbookRegular}${nigeriaEbookSavings ? ` · ${nigeriaEbookSavings}` : ""}</small></div>` : `<div class="book-purchase-nigeria-ebook-pricing"><span>${nigeriaEbookPrice}</span></div>`}
          <p>Get the digital edition in Nigeria through Selar. Companion Journal access is included.</p>
          <a class="book-purchase-action book-purchase-action-selar" href="${selarUrl}" target="_blank" rel="noopener noreferrer">${selarLabel}</a>
        </div>`;

const styles = `
<style>
${styleMarker}
.book-purchase-nigeria-ebook{display:grid;gap:9px;width:100%;margin-top:4px;padding-top:15px;border-top:1px solid rgba(14,45,77,.14)}
.book-purchase-format-label{color:#93651d;font-size:.75rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
.book-purchase-nigeria-ebook-pricing{display:flex;align-items:baseline;justify-content:space-between;gap:10px;color:#0e2d4d}
.book-purchase-nigeria-ebook-pricing>span{font-size:1.25rem;font-weight:850}
.book-purchase-nigeria-ebook-pricing small{color:#707983;font-size:.76rem;line-height:1.35;text-align:right}
.book-purchase-action-selar{background:#8050b8}
.book-purchase-action-selar:hover,.book-purchase-action-selar:focus-visible{background:#6b409e}
</style>`;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

  // Remove previous Selar/unified eBook injections so this build has one canonical layout.
  html = html.replace(/\s*<div class="book-purchase-selar" data-selar-purchase="true">[\s\S]*?<\/div>\s*(?=<div class="book-purchase-footer">)/gi, "\n    ");
  html = html.replace(/\s*<div class="book-purchase-nigeria-ebook" data-nigeria-ebook="true">[\s\S]*?<\/div>\s*(?=<\/article>)/gi, "\n      ");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Unified eBook Options \*\/[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Selar Purchase Link \*\/[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\s*<style>\s*\/\* Divine Blueprint Nigeria Selar eBook \*\/[\s\S]*?<\/style>/gi, "");

  // Restore the international digital card to Kindle only.
  html = html.replace("<h3>eBook</h3>", "<h3>Kindle eBook</h3>");
  html = html.replace("Preorder the eBook at the launch price on Kindle or Selar and register for your digital Companion Journal.", kindleDescription);
  html = html.replace("Get the eBook on Kindle or Selar and register for your digital Companion Journal.", kindleDescription);
  html = html.replace(
    /<div class="book-purchase-ebook-actions" data-ebook-options="true">[\s\S]*?<\/div>/gi,
    `<a class="book-purchase-action book-purchase-action-gold" href="${kindleUrl}" target="_blank" rel="noopener noreferrer">${kindleLabel}</a>`
  );
  html = html.replace(/>Preorder on Kindle ↗<\/a>/gi, `>${kindleLabel}</a>`);
  html = html.replace(/>Buy on Kindle ↗<\/a>/gi, `>${kindleLabel}</a>`);

  // Add Selar only to the Nigeria card, which now offers both paperback and eBook.
  const nigeriaArticlePattern = /(<article class="book-purchase-card">\s*<span class="book-purchase-region">Nigeria<\/span>)([\s\S]*?)(<\/article>)/i;
  const nigeriaMatch = html.match(nigeriaArticlePattern);
  if (!nigeriaMatch) {
    throw new Error(`Could not locate the Nigeria purchase card in ${page}.`);
  }

  let nigeriaBody = nigeriaMatch[2];
  nigeriaBody = nigeriaBody.replace("<h3>Paperback</h3>", "<h3>Paperback &amp; eBook</h3>");
  nigeriaBody = nigeriaBody.replace(
    "Preorder directly for local payment and delivery coordination at the reduced preorder price.",
    "Choose paperback for local delivery or the eBook for instant digital access in Nigeria."
  );
  nigeriaBody = nigeriaBody.replace(
    "Order directly for local payment and delivery coordination.",
    "Choose paperback for local delivery or the eBook for instant digital access in Nigeria."
  );
  nigeriaBody = `${nigeriaBody.trimEnd()}\n        ${nigeriaEbookBlock}\n      `;
  html = html.replace(nigeriaArticlePattern, `$1${nigeriaBody}$3`);

  html = html.replace("</head>", `${styles}\n</head>`);

  if (
    !html.includes("<h3>Kindle eBook</h3>") ||
    !html.includes(kindleUrl) ||
    !html.includes(kindleLabel) ||
    !html.includes("<h3>Paperback &amp; eBook</h3>") ||
    !html.includes(nigeriaMarker) ||
    !html.includes(selarUrl) ||
    !html.includes(selarLabel) ||
    html.includes('data-ebook-options="true"') ||
    html.includes('data-selar-purchase="true"')
  ) {
    throw new Error(`Nigeria-only Selar placement did not verify in ${page}.`);
  }

  // Selar must occur inside the Nigeria card, not the Kindle card or a standalone callout.
  const finalNigeria = html.match(nigeriaArticlePattern)?.[0] || "";
  if (!finalNigeria.includes(selarUrl) || finalNigeria.includes(kindleUrl)) {
    throw new Error(`Nigeria storefront routing is incorrect in ${page}.`);
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
    "INTERNATIONAL_EBOOK=KINDLE",
    "NIGERIA_FORMATS=PAPERBACK_AND_EBOOK",
    `MODE=${mode}`,
    `KINDLE_URL=${kindleUrl}`,
    `SELAR_URL=${selarUrl}`,
    `NIGERIA_EBOOK_PRICE=${nigeriaEbookPrice}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Kept Kindle eBook international and moved Selar eBook into the Nigeria paperback/eBook card across ${updatedPages} Divine Blueprint storefront page(s).`);
