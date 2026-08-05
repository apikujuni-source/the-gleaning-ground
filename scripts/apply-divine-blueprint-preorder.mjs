import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const styleMarker = "/* Divine Blueprint Preorder Pricing */";

if (config.mode !== "preorder") {
  throw new Error("The Divine Blueprint purchase configuration is not in preorder mode.");
}

const whatsappText = encodeURIComponent(
  `Hello, I would like to preorder The Divine Blueprint paperback at the special preorder price of ${config.paperbackPriceNigeria} (original price ${config.paperbackOriginalPriceNigeria}). Please send me the payment, delivery, and expected availability details. The digital Companion Journal is included with my copy.`
);
const primaryWhatsappUrl = `https://wa.me/${config.whatsappPrimary}?text=${whatsappText}`;
const alternateWhatsappUrl = `https://wa.me/${config.whatsappAlternate}?text=${whatsappText}`;

const styles = `
<style>
${styleMarker}
.book-preorder-banner{display:inline-flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 13px;border-radius:999px;background:#8d2f24;color:#fff;font-size:.76rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;box-shadow:0 8px 22px rgba(141,47,36,.2)}
.book-preorder-offer{display:grid;gap:7px;width:100%;padding:15px 16px;border:1px solid rgba(185,135,44,.32);border-radius:12px;background:linear-gradient(135deg,#fffaf0,#fff)}
.book-preorder-badge{display:inline-flex;width:max-content;padding:5px 9px;border-radius:999px;background:#f2dfb7;color:#744d12;font-size:.7rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.book-preorder-original{display:flex;align-items:baseline;gap:8px;color:#737b83;font-size:.86rem;font-weight:700}
.book-preorder-original del{color:#8a3b32;font-size:1.05rem;text-decoration-thickness:2px}
.book-preorder-save{display:inline-flex;width:max-content;padding:5px 8px;border-radius:7px;background:#e4f2e8;color:#22623f;font-size:.78rem;font-weight:900}
.book-preorder-future-price{display:block;margin-top:2px;color:#68727c;font-size:.76rem;line-height:1.45}
.book-preorder-future-price strong{color:#0e2d4d}
[data-book-purchase-open]{position:relative}
</style>`;

function priceOffer(originalPrice, preorderPrice, savings, futureNote = "") {
  return `<div class="book-preorder-offer">
          <span class="book-preorder-badge">Limited preorder price</span>
          <div class="book-preorder-original"><span>Original price</span><del>${originalPrice}</del></div>
          <div class="book-purchase-price">${preorderPrice}</div>
          <strong class="book-preorder-save">${savings}</strong>
          ${futureNote}
        </div>`;
}

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

function applyPreorder(html) {
  let updated = html;

  updated = updated.replace(
    /(<button\b[^>]*data-book-purchase-open[^>]*>)[\s\S]*?(<\/button>)/gi,
    "$1Preorder the Book$2"
  );

  updated = updated
    .replace("<span>Choose your preferred edition</span>", "<span class=\"book-preorder-banner\">Preorder savings now available</span>")
    .replace("<h2 id=\"book-purchase-title\">Buy <em>The Divine Blueprint</em></h2>", "<h2 id=\"book-purchase-title\">Preorder <em>The Divine Blueprint</em></h2>")
    .replace(
      "<p id=\"book-purchase-description\">Every copy includes personal access to the digital Companion Journal.</p>",
      "<p id=\"book-purchase-description\">Reserve your copy at the special preorder price. Every copy includes personal access to the digital Companion Journal.</p>"
    );

  updated = updated.replace(
    `<div class="book-purchase-price">${config.paperbackPriceUs}</div>`,
    priceOffer(config.paperbackOriginalPriceUs, config.paperbackPriceUs, config.paperbackSavingsUs)
  );

  updated = updated.replace(
    `<div class="book-purchase-price">${config.kindleLaunchPrice} <small>launch price</small></div>`,
    priceOffer(
      config.kindleOriginalPrice,
      config.kindleLaunchPrice,
      config.kindleSavings,
      `<small class="book-preorder-future-price">Planned regular price listed for later: <strong>${config.kindleRegularPrice}</strong>.</small>`
    )
  );

  updated = updated.replace(
    `<div class="book-purchase-price">${config.paperbackPriceNigeria}</div>`,
    priceOffer(config.paperbackOriginalPriceNigeria, config.paperbackPriceNigeria, config.paperbackSavingsNigeria)
  );

  updated = updated
    .replace("Order the printed book through Amazon. Journal access is included.", "Preorder the printed book through Amazon at the reduced preorder price. Journal access is included.")
    .replace("Buy Paperback on Amazon ↗", "Preorder Paperback on Amazon ↗")
    .replace("Read instantly on Kindle and register for your digital Companion Journal.", "Preorder the Kindle edition and register for your digital Companion Journal.")
    .replace("Buy Kindle eBook ↗", "Preorder Kindle eBook ↗")
    .replace("Order directly for local payment and delivery coordination.", "Preorder directly for local payment and delivery coordination at the reduced preorder price.")
    .replace("Order on WhatsApp ↗", "Preorder on WhatsApp ↗")
    .replace("Already purchased?", "Already purchased or preordered?");

  updated = updated.replace(
    new RegExp(`href=["']https:\\/\\/wa\\.me\\/${config.whatsappPrimary}[^"']*["']`, "i"),
    `href="${primaryWhatsappUrl}"`
  );
  updated = updated.replace(
    new RegExp(`href=["']https:\\/\\/wa\\.me\\/${config.whatsappAlternate}[^"']*["']`, "i"),
    `href="${alternateWhatsappUrl}"`
  );

  if (!updated.includes(styleMarker)) updated = updated.replace("</head>", `${styles}\n</head>`);
  return updated;
}

const pages = await findHtmlFiles(siteRoot);
let updatedPages = 0;
let preorderButtons = 0;

for (const page of pages) {
  const html = await readFile(page, "utf8");
  if (!html.includes('id="book-purchase-modal"')) continue;

  const updated = applyPreorder(html);
  const matches = updated.match(/data-book-purchase-open/g) || [];
  preorderButtons += matches.length;

  if (
    !updated.includes("Preorder <em>The Divine Blueprint</em>") ||
    !updated.includes(config.paperbackOriginalPriceUs) ||
    !updated.includes(config.kindleOriginalPrice) ||
    !updated.includes(config.paperbackOriginalPriceNigeria) ||
    !updated.includes("Preorder the Book")
  ) {
    throw new Error(`Preorder pricing did not verify in ${page}.`);
  }

  await writeFile(page, updated, "utf8");
  updatedPages += 1;
}

if (updatedPages === 0 || preorderButtons === 0) {
  throw new Error("No Divine Blueprint purchase pages or preorder buttons were updated.");
}

await writeFile(
  join(siteRoot, "book-preorder-status.txt"),
  [
    "BOOK_PREORDER_FLOW=ACTIVE",
    "VERSION=2026-08-04-1",
    `PAPERBACK_US_ORIGINAL=${config.paperbackOriginalPriceUs}`,
    `PAPERBACK_US_PREORDER=${config.paperbackPriceUs}`,
    `KINDLE_ORIGINAL=${config.kindleOriginalPrice}`,
    `KINDLE_PREORDER=${config.kindleLaunchPrice}`,
    `KINDLE_PLANNED_REGULAR=${config.kindleRegularPrice}`,
    `PAPERBACK_NIGERIA_ORIGINAL=${config.paperbackOriginalPriceNigeria}`,
    `PAPERBACK_NIGERIA_PREORDER=${config.paperbackPriceNigeria}`,
    `PREORDER_BUTTONS=${preorderButtons}`,
    `UPDATED_PAGES=${updatedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Applied slashed preorder pricing and activated ${preorderButtons} preorder button reference(s) across ${updatedPages} page(s).`);
