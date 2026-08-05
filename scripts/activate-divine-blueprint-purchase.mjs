import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const configPath = "content/divine-blueprint/purchase.json";
const runtimeName = "divine-blueprint-purchase.js";
const runtimeSource = join("assets", runtimeName);
const runtimeOutput = join(siteRoot, "assets", runtimeName);
const runtimeTag = `<script src="/assets/${runtimeName}?v=20260804-1"></script>`;
const modalMarker = 'id="book-purchase-modal"';
const styleMarker = "/* Divine Blueprint Purchase Selector */";

const config = JSON.parse(await readFile(configPath, "utf8"));

const whatsappText = encodeURIComponent(
  `Hello, I would like to order The Divine Blueprint paperback for ${config.paperbackPriceNigeria}. Please send me the payment and delivery details. The digital Companion Journal is included with my copy.`
);
const primaryWhatsappUrl = `https://wa.me/${config.whatsappPrimary}?text=${whatsappText}`;
const alternateWhatsappUrl = `https://wa.me/${config.whatsappAlternate}?text=${whatsappText}`;
const bulkSubject = encodeURIComponent("The Divine Blueprint bulk or church order");
const bulkBody = encodeURIComponent(
  "Hello, I would like information about a bulk or church order for The Divine Blueprint. Please send pricing, delivery, and payment details."
);
const bulkEmailUrl = `mailto:${config.email}?subject=${bulkSubject}&body=${bulkBody}`;

const modal = `
<div class="book-purchase-modal" id="book-purchase-modal" hidden aria-hidden="true">
  <div class="book-purchase-backdrop" data-book-purchase-close></div>
  <section class="book-purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="book-purchase-title" aria-describedby="book-purchase-description">
    <button class="book-purchase-close" type="button" data-book-purchase-close aria-label="Close purchase options">×</button>
    <div class="book-purchase-heading">
      <span>Choose your preferred edition</span>
      <h2 id="book-purchase-title">Buy <em>The Divine Blueprint</em></h2>
      <p id="book-purchase-description">Every copy includes personal access to the digital Companion Journal.</p>
    </div>

    <div class="book-purchase-grid">
      <article class="book-purchase-card book-purchase-card-featured">
        <span class="book-purchase-region">United States &amp; international</span>
        <h3>Paperback</h3>
        <div class="book-purchase-price">${config.paperbackPriceUs}</div>
        <p>Order the printed book through Amazon. Journal access is included.</p>
        <a class="book-purchase-action" href="${config.amazonPaperbackUrl}" target="_blank" rel="noopener noreferrer" data-book-purchase-initial-focus>Buy Paperback on Amazon ↗</a>
        <small>Amazon search opens using ISBN ${config.isbn}.</small>
      </article>

      <article class="book-purchase-card">
        <span class="book-purchase-region">United States &amp; international</span>
        <h3>Kindle eBook</h3>
        <div class="book-purchase-price">${config.kindleLaunchPrice} <small>launch price</small></div>
        <p>Read instantly on Kindle and register for your digital Companion Journal.</p>
        <a class="book-purchase-action book-purchase-action-gold" href="${config.amazonKindleUrl}" target="_blank" rel="noopener noreferrer">Buy Kindle eBook ↗</a>
        <small>Planned regular price: ${config.kindleRegularPrice}.</small>
      </article>

      <article class="book-purchase-card">
        <span class="book-purchase-region">Nigeria</span>
        <h3>Paperback</h3>
        <div class="book-purchase-price">${config.paperbackPriceNigeria}</div>
        <p>Order directly for local payment and delivery coordination.</p>
        <a class="book-purchase-action book-purchase-action-whatsapp" href="${primaryWhatsappUrl}" target="_blank" rel="noopener noreferrer">Order on WhatsApp ↗</a>
        <a class="book-purchase-secondary" href="${alternateWhatsappUrl}" target="_blank" rel="noopener noreferrer">Use alternate WhatsApp number</a>
      </article>
    </div>

    <div class="book-purchase-footer">
      <div>
        <strong>Church or bulk orders</strong>
        <p>Request quantity pricing, ministry orders, and delivery support.</p>
      </div>
      <a class="book-purchase-secondary book-purchase-bulk" href="${bulkEmailUrl}">Request bulk-order details</a>
    </div>

    <p class="book-purchase-journal-note">Already purchased? <a href="${config.companionUrl}">Register and access your Companion Journal.</a></p>
  </section>
</div>`;

const styles = `
<style>
${styleMarker}
.book-purchase-modal[hidden]{display:none!important}
.book-purchase-modal{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;box-sizing:border-box}
.book-purchase-backdrop{position:absolute;inset:0;background:rgba(4,18,31,.78);backdrop-filter:blur(7px)}
.book-purchase-dialog{position:relative;z-index:1;width:min(1040px,100%);max-height:min(90vh,920px);overflow:auto;padding:clamp(26px,5vw,52px);border:1px solid rgba(185,135,44,.35);border-radius:24px;background:linear-gradient(145deg,#fffdf8 0%,#f6f0e5 100%);box-shadow:0 35px 100px rgba(0,0,0,.36);box-sizing:border-box;color:#17324d}
.book-purchase-close{position:absolute;top:16px;right:18px;width:42px;height:42px;border:0;border-radius:50%;background:#e8dfd0;color:#17324d;font-size:1.8rem;line-height:1;cursor:pointer}
.book-purchase-heading{text-align:center;max-width:760px;margin:0 auto 30px}
.book-purchase-heading>span,.book-purchase-region{color:#93651d;font-size:.75rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.book-purchase-heading h2{margin:.45rem 0 .6rem;color:#0e2d4d;font-size:clamp(2rem,5vw,3.7rem);line-height:1.02}
.book-purchase-heading p{margin:0;color:#52606e;font-size:1.05rem}
.book-purchase-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.book-purchase-card{display:flex;flex-direction:column;align-items:flex-start;gap:13px;padding:25px;border:1px solid rgba(14,45,77,.14);border-radius:18px;background:#fff;box-shadow:0 14px 35px rgba(14,45,77,.07)}
.book-purchase-card-featured{border-color:rgba(185,135,44,.7);box-shadow:0 18px 45px rgba(14,45,77,.12)}
.book-purchase-card h3{margin:0;color:#0e2d4d;font-size:1.55rem}
.book-purchase-card p{margin:0;color:#53606d;line-height:1.6}
.book-purchase-card>small{color:#707983;line-height:1.45}
.book-purchase-price{color:#0e2d4d;font-size:2rem;font-weight:850;line-height:1}
.book-purchase-price small{display:inline;font-size:.72rem;font-weight:700;color:#8a641f}
.book-purchase-action{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:48px;margin-top:auto;padding:12px 15px;border-radius:9px;background:#0e2d4d;color:#fff!important;text-align:center;text-decoration:none!important;font-weight:800;box-sizing:border-box}
.book-purchase-action:hover,.book-purchase-action:focus-visible{background:#173f67;transform:translateY(-1px)}
.book-purchase-action-gold{background:#a87520}
.book-purchase-action-gold:hover,.book-purchase-action-gold:focus-visible{background:#8d6119}
.book-purchase-action-whatsapp{background:#176b43}
.book-purchase-action-whatsapp:hover,.book-purchase-action-whatsapp:focus-visible{background:#105535}
.book-purchase-secondary{color:#0e2d4d!important;text-decoration:underline!important;font-weight:750}
.book-purchase-footer{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:20px;padding:21px 23px;border-left:4px solid #b9872c;background:#fff}
.book-purchase-footer p{margin:.3rem 0 0;color:#5b6671}
.book-purchase-bulk{flex:0 0 auto}
.book-purchase-journal-note{text-align:center;margin:22px 0 0;color:#53606d}
.book-purchase-journal-note a{color:#0e2d4d;font-weight:800}
html.book-purchase-open,body.book-purchase-open{overflow:hidden}
@media(max-width:850px){.book-purchase-grid{grid-template-columns:1fr}.book-purchase-dialog{max-width:650px}.book-purchase-footer{align-items:flex-start;flex-direction:column}.book-purchase-bulk{flex:auto}}
@media(max-width:520px){.book-purchase-modal{padding:10px}.book-purchase-dialog{padding:50px 18px 26px;border-radius:16px}.book-purchase-card{padding:21px}.book-purchase-heading h2{font-size:2.2rem}}
</style>`;

const purchasePhrases = new Set([
  "buy the book",
  "get the book",
  "order the book",
  "purchase the book",
  "get your copy",
  "buy now",
  "order now"
]);

function decodeText(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function safeAttributes(attrs) {
  const kept = [];
  for (const name of ["class", "id", "title", "aria-label"]) {
    const match = attrs.match(new RegExp(`\\b${name}=(["'])(.*?)\\1`, "i"));
    if (match) kept.push(`${name}=${match[1]}${match[2]}${match[1]}`);
  }
  return kept.length ? ` ${kept.join(" ")}` : "";
}

function activateTriggers(html) {
  let count = 0;
  const updated = html.replace(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (match, _tag, attrs, inner) => {
    if (!purchasePhrases.has(decodeText(inner))) return match;
    count += 1;
    return `<button type="button"${safeAttributes(attrs)} data-book-purchase-open aria-haspopup="dialog" aria-controls="book-purchase-modal">${inner}</button>`;
  });
  return { html: updated, count };
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

await mkdir(join(siteRoot, "assets"), { recursive: true });
await copyFile(runtimeSource, runtimeOutput);

const pages = await findHtmlFiles(siteRoot);
let updatedPages = 0;
let activatedTriggers = 0;

for (const page of pages) {
  let html = await readFile(page, "utf8");
  const activated = activateTriggers(html);
  html = activated.html;
  activatedTriggers += activated.count;

  html = html.replace(
    /\s*<script\b[^>]*src=["']\/assets\/divine-blueprint-purchase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,
    ""
  );

  if (!html.includes(styleMarker)) html = html.replace("</head>", `${styles}\n</head>`);
  if (!html.includes(modalMarker)) html = html.replace("</body>", `${modal}\n</body>`);
  if (!html.includes(runtimeTag)) html = html.replace("<head>", `<head>\n${runtimeTag}`);

  if (activated.count > 0 || html.includes(modalMarker)) {
    await writeFile(page, html, "utf8");
    updatedPages += 1;
  }
}

if (activatedTriggers === 0) {
  throw new Error("No Divine Blueprint purchase controls were found to activate.");
}

await writeFile(
  join(siteRoot, "book-purchase-status.txt"),
  [
    "BOOK_PURCHASE_FLOW=ACTIVE",
    "VERSION=2026-08-04-1",
    `PAPERBACK_US=${config.paperbackPriceUs}`,
    `KINDLE_LAUNCH=${config.kindleLaunchPrice}`,
    `PAPERBACK_NIGERIA=${config.paperbackPriceNigeria}`,
    `ACTIVATED_TRIGGERS=${activatedTriggers}`,
    `UPDATED_PAGES=${updatedPages}`,
    "COMPANION_JOURNAL=INCLUDED_WITH_EVERY_COPY"
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Activated ${activatedTriggers} Divine Blueprint purchase control(s) across ${updatedPages} page(s).`);
