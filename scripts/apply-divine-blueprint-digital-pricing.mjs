import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const noteMarker = "data-digital-pricing-note";
const styleMarker = "/* Divine Blueprint Digital Pricing Summary */";

const expected = {
  digitalRegularPriceInternational: "$9.99",
  digitalPreorderPriceInternational: "$7.99",
  kindleRegularPrice: "$9.99",
  kindleLaunchPrice: "$7.99",
  digitalRegularPriceNigeria: "₦10,000",
  digitalPreorderPriceNigeria: "₦8,000"
};

for (const [key, value] of Object.entries(expected)) {
  if (config[key] !== value) throw new Error(`Unexpected ${key}: ${config[key]}; expected ${value}.`);
}
if (config.kindleRegularPrice !== config.digitalRegularPriceInternational || config.kindleLaunchPrice !== config.digitalPreorderPriceInternational) {
  throw new Error("Kindle pricing must match the international digital pricing.");
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

function removeExistingNote(html) {
  return html.replace(/\s*<div\b[^>]*data-digital-pricing-note[^>]*>[\s\S]*?<\/div>\s*<small>Every digital copy includes access to the digital Companion Journal\.<\/small>\s*<\/div>/gi, "");
}

let pagesUpdated = 0;
for (const page of await findHtmlFiles(siteRoot)) {
  let html = await readFile(page, "utf8");
  if (!html.includes('id="book-purchase-modal"')) continue;

  html = removeExistingNote(html);
  if (!html.includes(styleMarker)) html = html.replace("</head>", `${styles}\n</head>`);

  const gridClose = /(<div class="book-purchase-grid">[\s\S]*?<\/div>)\s*(<div class="book-purchase-footer">)/i;
  if (!gridClose.test(html)) throw new Error(`Could not locate purchase grid/footer boundary in ${page}.`);
  html = html.replace(gridClose, `$1\n${note}\n$2`);

  const modal = html.match(/<div class="book-purchase-modal"[\s\S]*?<\/section>\s*<\/div>/i)?.[0] || "";
  for (const value of [
    config.digitalRegularPriceInternational,
    config.digitalPreorderPriceInternational,
    config.digitalRegularPriceNigeria,
    config.digitalPreorderPriceNigeria
  ]) {
    if (!modal.includes(value)) throw new Error(`${page}: digital pricing value missing from purchase modal: ${value}`);
  }
  for (const stale of ["$6.99", "$8.99", "₦7,000", "₦9,000"]) {
    if (modal.includes(stale)) throw new Error(`${page}: stale digital price remains in purchase modal: ${stale}`);
  }
  if ((modal.match(/data-digital-pricing-note/g) || []).length !== 1) throw new Error(`${page}: expected exactly one digital pricing summary.`);

  await writeFile(page, html, "utf8");
  pagesUpdated += 1;
}

if (!pagesUpdated) throw new Error("No Divine Blueprint purchase modals were updated with digital pricing.");

await writeFile(
  join(siteRoot, "digital-pricing-status.txt"),
  [
    "DIGITAL_PRICING=ACTIVE",
    `INTERNATIONAL_REGULAR=${config.digitalRegularPriceInternational}`,
    `INTERNATIONAL_PREORDER=${config.digitalPreorderPriceInternational}`,
    `NIGERIA_REGULAR=${config.digitalRegularPriceNigeria}`,
    `NIGERIA_PREORDER=${config.digitalPreorderPriceNigeria}`,
    `UPDATED_PAGES=${pagesUpdated}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Applied Divine Blueprint digital pricing summary across ${pagesUpdated} purchase page(s).`);
