import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const paperbackUrl = String(config.amazonPaperbackUrl || "").trim();
const kindleUrl = String(config.amazonKindleUrl || "").trim();
const nigeriaOrderPath = "/nigeria-order/";

if (!paperbackUrl || !kindleUrl) {
  throw new Error("Missing Divine Blueprint paperback or Kindle URL configuration.");
}

function escapeRegExp(value) {
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

const paperbackHrefPattern = new RegExp(
  `\\s*<a\\b[^>]*href=(["'])${escapeRegExp(paperbackUrl)}\\1[^>]*>[\\s\\S]*?<\\/a>`,
  "gi"
);
const paperbackLabelPattern = /\s*<a\b[^>]*>[\s\S]*?(?:Preorder|Buy) Paperback on Amazon ↗[\s\S]*?<\/a>/gi;
const amazonIsbnNotePattern = /\s*<small>Amazon search opens using ISBN[^<]*<\/small>/gi;

let updatedPages = 0;
let removedLinks = 0;
let storefrontPages = 0;

for (const page of await findHtmlFiles(siteRoot)) {
  let html = await readFile(page, "utf8");
  const before = html;

  const directMatches = html.match(paperbackHrefPattern) || [];
  removedLinks += directMatches.length;
  html = html.replace(paperbackHrefPattern, "");

  const labelMatches = html.match(paperbackLabelPattern) || [];
  removedLinks += labelMatches.length;
  html = html.replace(paperbackLabelPattern, "");
  html = html.replace(amazonIsbnNotePattern, "");

  // Keep the US/international paperback card informational without an order call-to-action.
  html = html
    .replace(
      "Preorder the printed book through Amazon at the reduced preorder price. Journal access is included.",
      "Paperback edition for United States & international readers. Journal access is included."
    )
    .replace(
      "Order the printed book through Amazon. Journal access is included.",
      "Paperback edition for United States & international readers. Journal access is included."
    );

  // Make Kindle the first purchase action when the modal opens now that the paperback action is hidden.
  html = html.replace(
    /<a class="book-purchase-action book-purchase-action-gold"(?![^>]*data-book-purchase-initial-focus)([^>]*href=(["']))/i,
    '<a class="book-purchase-action book-purchase-action-gold" data-book-purchase-initial-focus$1'
  );

  if (html.includes('id="book-purchase-modal"')) {
    storefrontPages += 1;
    const modal = html.match(/<div class="book-purchase-modal"[\s\S]*?<\/section>\s*<\/div>/i)?.[0] || "";
    const nigeriaCard = modal.match(/<article class="book-purchase-card">\s*<span class="book-purchase-region">Nigeria<\/span>[\s\S]*?<\/article>/i)?.[0] || "";

    if (
      modal.includes(paperbackUrl) ||
      /(?:Preorder|Buy) Paperback on Amazon ↗/i.test(modal) ||
      !modal.includes(kindleUrl) ||
      !modal.includes("Kindle eBook") ||
      !modal.includes("data-book-purchase-initial-focus") ||
      !nigeriaCard.includes(nigeriaOrderPath) ||
      !nigeriaCard.includes('data-nigeria-website-order="true"')
    ) {
      throw new Error(`Paperback-link hiding or preserved purchase options did not verify in ${page}.`);
    }
  }

  if (html !== before) {
    await writeFile(page, html, "utf8");
    updatedPages += 1;
  }
}

if (storefrontPages === 0) {
  throw new Error("No Divine Blueprint storefront pages were found.");
}
if (removedLinks === 0) {
  throw new Error("No US/international paperback order links were found to hide.");
}

await writeFile(
  join(siteRoot, "us-paperback-order-status.txt"),
  [
    "US_INTERNATIONAL_PAPERBACK_ORDER_LINK=HIDDEN",
    "KINDLE_ORDER_LINK=ACTIVE",
    "NIGERIA_ORDER_LINK=ACTIVE",
    `REMOVED_LINKS=${removedLinks}`,
    `STOREFRONT_PAGES=${storefrontPages}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Hid ${removedLinks} US/international paperback order link(s); kept Kindle and Nigeria ordering active across ${storefrontPages} storefront page(s).`);
