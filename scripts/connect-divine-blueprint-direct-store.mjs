import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const storeUrl = config.storeUrl || "https://divineblueprint.gleaningground.com/shop/";
const marker = "<!-- Direct Divine Blueprint Store -->";

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function connectStore(html) {
  if (!html.includes('id="book-purchase-modal"')) return { html, changed: false };
  let updated = html;

  updated = updated.replace(
    /<a class="book-purchase-action" href="([^"]+)"([^>]*)>Preorder Paperback on Amazon ↗<\/a>/i,
    `${marker}<a class="book-purchase-action" href="${storeUrl}#international-paperback"$2>Preorder Directly on the Official Site ↗</a>\n        <a class="book-purchase-secondary" href="$1" target="_blank" rel="noopener noreferrer">Or preorder through Amazon ↗</a>`
  );

  updated = updated.replace(
    /<a class="book-purchase-action book-purchase-action-whatsapp" href="([^"]+)"([^>]*)>Preorder on WhatsApp ↗<\/a>/i,
    `${marker}<a class="book-purchase-action book-purchase-action-whatsapp" href="${storeUrl}#nigeria-paperback">Pay Securely on the Official Site ↗</a>\n        <a class="book-purchase-secondary" href="$1" target="_blank" rel="noopener noreferrer">Ask about delivery on WhatsApp ↗</a>`
  );

  updated = updated.replace(
    /<a class="book-purchase-secondary book-purchase-bulk" href="[^"]+">Request bulk-order details<\/a>/i,
    `<a class="book-purchase-secondary book-purchase-bulk" href="${storeUrl}#bulk-orders">Request church or bulk pricing</a>`
  );

  updated = updated.replace(
    "Reserve your copy at the special preorder price. Every copy includes personal access to the digital Companion Journal.",
    "Reserve your copy directly through the official Divine Blueprint store or choose an alternative retailer. Every copy includes personal access to the digital Companion Journal."
  );

  return { html: updated, changed: updated !== html };
}

const pages = await findHtmlFiles(siteRoot);
let changedPages = 0;
for (const page of pages) {
  const html = await readFile(page, "utf8");
  const connected = connectStore(html);
  if (!connected.changed) continue;

  if (
    !connected.html.includes(`${storeUrl}#international-paperback`) ||
    !connected.html.includes(`${storeUrl}#nigeria-paperback`) ||
    !connected.html.includes(`${storeUrl}#bulk-orders`)
  ) {
    throw new Error(`Direct-store links did not validate in ${page}.`);
  }

  await writeFile(page, connected.html, "utf8");
  changedPages += 1;
}

if (changedPages === 0) throw new Error("No Divine Blueprint purchase pages were connected to the direct store.");

await writeFile(
  join(siteRoot, "direct-store-link-status.txt"),
  [
    "DIRECT_STORE_LINKS=ACTIVE",
    `STORE_URL=${storeUrl}`,
    `UPDATED_PAGES=${changedPages}`,
    "INTERNATIONAL_DIRECT_CHECKOUT=STRIPE",
    "NIGERIA_DIRECT_CHECKOUT=PAYSTACK",
    "AMAZON_ALTERNATIVE=ACTIVE",
    "WHATSAPP_ALTERNATIVE=ACTIVE"
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Connected ${changedPages} Divine Blueprint page(s) to ${storeUrl}.`);
