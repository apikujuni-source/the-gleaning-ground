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

const usInternationalCardPattern = /\s*<article class="book-purchase-card">\s*<span class="book-purchase-region">United States (?:&amp;|&) international<\/span>[\s\S]*?<\/article>/gi;
const paperbackHrefPattern = new RegExp(
  `\\s*<a\\b[^>]*href=(["'])${escapeRegExp(paperbackUrl)}\\1[^>]*>[\\s\\S]*?<\\/a>`,
  "gi"
);
const paperbackLabelPattern = /\s*<a\b[^>]*>[\s\S]*?(?:Preorder|Buy) Paperback on Amazon ↗[\s\S]*?<\/a>/gi;
const amazonIsbnNotePattern = /\s*<small>Amazon search opens using ISBN[^<]*<\/small>/gi;

let updatedPages = 0;
let removedCards = 0;
let removedLinks = 0;
let storefrontPages = 0;

for (const page of await findHtmlFiles(siteRoot)) {
  let html = await readFile(page, "utf8");
  const before = html;

  const cardMatches = html.match(usInternationalCardPattern) || [];
  removedCards += cardMatches.length;
  html = html.replace(usInternationalCardPattern, "");

  // Defensive cleanup in case a legacy paperback action appears outside the purchase card.
  const directMatches = html.match(paperbackHrefPattern) || [];
  removedLinks += directMatches.length;
  html = html.replace(paperbackHrefPattern, "");

  const labelMatches = html.match(paperbackLabelPattern) || [];
  removedLinks += labelMatches.length;
  html = html.replace(paperbackLabelPattern, "");
  html = html.replace(amazonIsbnNotePattern, "");

  // Make Kindle the first purchase action when the modal opens.
  html = html.replace(
    /<a class="book-purchase-action book-purchase-action-gold"(?![^>]*data-book-purchase-initial-focus)([^>]*href=(["']))/i,
    '<a class="book-purchase-action book-purchase-action-gold" data-book-purchase-initial-focus$1'
  );

  if (html.includes('id="book-purchase-modal"')) {
    storefrontPages += 1;
    const modal = html.match(/<div class="book-purchase-modal"[\s\S]*?<\/section>\s*<\/div>/i)?.[0] || "";
    const nigeriaCard = modal.match(/<article class="book-purchase-card">\s*<span class="book-purchase-region">Nigeria<\/span>[\s\S]*?<\/article>/i)?.[0] || "";

    if (
      /United States (?:&amp;|&) international/i.test(modal) ||
      modal.includes(paperbackUrl) ||
      /(?:Preorder|Buy) Paperback on Amazon ↗/i.test(modal) ||
      !modal.includes(kindleUrl) ||
      !modal.includes("Kindle eBook") ||
      !modal.includes("data-book-purchase-initial-focus") ||
      !nigeriaCard.includes(nigeriaOrderPath) ||
      !nigeriaCard.includes('data-nigeria-website-order="true"')
    ) {
      throw new Error(`US/international paperback removal or preserved purchase options did not verify in ${page}.`);
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
if (removedCards === 0) {
  throw new Error("No US/international paperback purchase cards were found to remove.");
}

await writeFile(
  join(siteRoot, "us-paperback-order-status.txt"),
  [
    "US_INTERNATIONAL_PAPERBACK_OPTION=HIDDEN",
    "KINDLE_ORDER_LINK=ACTIVE",
    "NIGERIA_ORDER_LINK=ACTIVE",
    `REMOVED_CARDS=${removedCards}`,
    `REMOVED_LOOSE_LINKS=${removedLinks}`,
    `STOREFRONT_PAGES=${storefrontPages}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Removed ${removedCards} US/international paperback purchase card(s); kept Kindle and Nigeria ordering active across ${storefrontPages} storefront page(s).`);
