import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const noteMarker = "data-digital-pricing-note";
const styleMarker = "/* Divine Blueprint Digital Pricing Summary */";

for (const key of [
  "digitalRegularPriceInternational",
  "digitalPreorderPriceInternational",
  "digitalSavingsInternational",
  "kindleRegularPrice",
  "kindleLaunchPrice",
  "kindleSavings",
  "digitalRegularPriceNigeria",
  "digitalPreorderPriceNigeria",
  "digitalSavingsNigeria"
]) {
  if (typeof config[key] !== "string" || !config[key].trim()) {
    throw new Error(`Purchase setting ${key} must be a non-empty string.`);
  }
}

const note = `<div class="book-digital-pricing-note" ${noteMarker}>
  <div>
    <span class="book-digital-pricing-label">Digital / softcopy pricing</span>
    <strong>Preorder now. Regular pricing begins after release.</strong>
  </div>
  <div class="book-digital-pricing-options">
    <p><span>International — Kindle / Selar</span><del>${config.digitalRegularPriceInternational}</del><strong>${config.digitalPreorderPriceInternational} preorder</strong></p>
    <p><span>Nigeria — Selar</span><del>${config.digitalRegularPriceNigeria}</del><strong>${config.digitalPreorderPriceNigeria} preorder</strong></p>
  </div>
  <small>Every digital copy includes access to the digital Companion Journal.</small>
</div>`;

const styles = `<style>
${styleMarker}
.book-digital-pricing-note{display:grid;grid-template-columns:minmax(210px,.85fr) minmax(0,1.35fr);gap:16px 24px;align-items:center;margin-top:20px;padding:18px 20px;border:1px solid rgba(185,135,44,.34);border-radius:14px;background:#fffaf0;color:#17324d}.book-digital-pricing-label{display:block;margin-bottom:4px;color:#93651d;font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.book-digital-pricing-note>div>strong{font-size:.98rem}.book-digital-pricing-options{display:grid;gap:8px}.book-digital-pricing-options p{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:baseline;margin:0;font-size:.88rem}.book-digital-pricing-options span{font-weight:800}.book-digital-pricing-options del{color:#8a3b32;font-weight:700}.book-digital-pricing-options strong{color:#22623f}.book-digital-pricing-note>small{grid-column:1/-1;color:#66717b}@media(max-width:760px){.book-digital-pricing-note{grid-template-columns:1fr}.book-digital-pricing-options p{grid-template-columns:1fr auto}.book-digital-pricing-options p strong{grid-column:1/-1}.book-digital-pricing-note>small{grid-column:auto}}
</style>`;

async function findHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

let pagesUpdated = 0;
const preorderMode = config.mode === "preorder";

if (preorderMode) {
  for (const page of await findHtmlFiles(siteRoot)) {
    let html = await readFile(page, "utf8");
    if (!html.includes('id="book-purchase-modal"')) continue;

    if (!html.includes(styleMarker)) html = html.replace("</head>", `${styles}\n</head>`);

    const gridClose = /(<div class="book-purchase-grid">[\s\S]*?<\/div>)\s*(<div class="book-purchase-footer">)/i;
    if (!gridClose.test(html)) throw new Error(`Could not locate purchase grid/footer boundary in ${page}.`);
    if (!html.includes(noteMarker)) html = html.replace(gridClose, `$1\n${note}\n$2`);

    const modal = html.match(/<div class="book-purchase-modal"[\s\S]*?<\/section>\s*<\/div>/i)?.[0] || "";
    for (const value of [
      config.digitalRegularPriceInternational,
      config.digitalPreorderPriceInternational,
      config.digitalRegularPriceNigeria,
      config.digitalPreorderPriceNigeria
    ]) {
      if (!modal.includes(value)) throw new Error(`${page}: configured digital pricing value is missing from the purchase modal: ${value}`);
    }
    if ((modal.match(/data-digital-pricing-note/g) || []).length !== 1) {
      throw new Error(`${page}: expected exactly one digital pricing summary.`);
    }

    await writeFile(page, html, "utf8");
    pagesUpdated += 1;
  }

  if (!pagesUpdated) throw new Error("No Divine Blueprint purchase modals were updated with digital preorder pricing.");
}

await writeFile(
  join(siteRoot, "digital-pricing-status.txt"),
  [
    `DIGITAL_PRICING_MODE=${preorderMode ? "PREORDER" : "STANDARD"}`,
    `INTERNATIONAL_REGULAR=${config.digitalRegularPriceInternational}`,
    `INTERNATIONAL_PREORDER=${config.digitalPreorderPriceInternational}`,
    `NIGERIA_REGULAR=${config.digitalRegularPriceNigeria}`,
    `NIGERIA_PREORDER=${config.digitalPreorderPriceNigeria}`,
    `UPDATED_PAGES=${pagesUpdated}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(
  preorderMode
    ? `Applied admin-managed Divine Blueprint digital preorder pricing across ${pagesUpdated} purchase page(s).`
    : "Divine Blueprint digital pricing is in standard mode; preorder-only digital pricing summaries were not added."
);
