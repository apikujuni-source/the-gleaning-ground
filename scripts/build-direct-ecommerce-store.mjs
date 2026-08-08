import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const publishRoot = "_site";
const siteRoot = join(publishRoot, "divine-blueprint-site");
const storeRoot = join(siteRoot, "shop");
const successRoot = join(storeRoot, "success");
const assetsRoot = join(siteRoot, "assets");
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));

const required = [
  "paperbackRegularPriceUs",
  "paperbackPriceUs",
  "paperbackSavingsUs",
  "kindleRegularPrice",
  "kindleLaunchPrice",
  "kindleSavings",
  "paperbackRegularPriceNigeria",
  "paperbackPriceNigeria",
  "paperbackSavingsNigeria",
  "storeUrl",
  "amazonPaperbackUrl",
  "amazonKindleUrl",
  "whatsappPrimary",
  "email",
  "companionUrl"
];
for (const key of required) {
  if (!config[key]) throw new Error(`Missing store configuration: ${key}`);
}

const coverSource = join(assetsRoot, "divine-blueprint-cover.webp");
if (!existsSync(coverSource)) throw new Error("The Divine Blueprint cover is unavailable for the store.");

await mkdir(storeRoot, { recursive: true });
await mkdir(successRoot, { recursive: true });
await mkdir(assetsRoot, { recursive: true });
await copyFile("storefront/divine-blueprint-store.css", join(assetsRoot, "divine-blueprint-store.css"));
await copyFile("storefront/divine-blueprint-store.js", join(assetsRoot, "divine-blueprint-store.js"));

const quantityOptions = Array.from({ length: 10 }, (_, index) => {
  const quantity = index + 1;
  return `<option value="${quantity}">${quantity}</option>`;
}).join("");
const whatsappText = encodeURIComponent(
  `Hello, I would like to preorder The Divine Blueprint paperback at ${config.paperbackPriceNigeria}. Please send Nigeria payment and delivery details.`
);
const whatsappUrl = `https://wa.me/${config.whatsappPrimary}?text=${whatsappText}`;

const replacements = {
  "{{STORE_URL}}": config.storeUrl,
  "{{PAPERBACK_REGULAR_US}}": config.paperbackRegularPriceUs,
  "{{PAPERBACK_PREORDER_US}}": config.paperbackPriceUs,
  "{{PAPERBACK_SAVINGS_US}}": config.paperbackSavingsUs,
  "{{KINDLE_REGULAR}}": config.kindleRegularPrice,
  "{{KINDLE_PREORDER}}": config.kindleLaunchPrice,
  "{{KINDLE_SAVINGS}}": config.kindleSavings,
  "{{PAPERBACK_REGULAR_NG}}": config.paperbackRegularPriceNigeria,
  "{{PAPERBACK_PREORDER_NG}}": config.paperbackPriceNigeria,
  "{{PAPERBACK_SAVINGS_NG}}": config.paperbackSavingsNigeria,
  "{{AMAZON_PAPERBACK_URL}}": config.amazonPaperbackUrl,
  "{{AMAZON_KINDLE_URL}}": config.amazonKindleUrl,
  "{{WHATSAPP_URL}}": whatsappUrl,
  "{{COMPANION_URL}}": config.companionUrl,
  "{{EMAIL}}": config.email,
  "{{QUANTITY_OPTIONS}}": quantityOptions,
  "{{YEAR}}": String(new Date().getFullYear())
};

function render(template) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) output = output.split(token).join(value);
  const unresolved = output.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) throw new Error(`Unresolved store template tokens: ${unresolved.join(", ")}`);
  return output;
}

const indexTemplate = await readFile("storefront/index.template.html", "utf8");
const successTemplate = await readFile("storefront/success.template.html", "utf8");
const indexHtml = render(indexTemplate);
const successHtml = render(successTemplate);

for (const expected of [
  config.storeUrl,
  config.paperbackPriceUs,
  config.paperbackRegularPriceUs,
  config.paperbackPriceNigeria,
  config.paperbackRegularPriceNigeria,
  "/api/checkout/stripe",
  "/api/checkout/paystack",
  "divine-blueprint-bulk-order"
]) {
  if (!indexHtml.includes(expected)) throw new Error(`Store validation failed: ${expected}`);
}

await writeFile(join(storeRoot, "index.html"), indexHtml, "utf8");
await writeFile(join(successRoot, "index.html"), successHtml, "utf8");

const redirectsPath = join(publishRoot, "_redirects");
let redirects = "";
try {
  redirects = await readFile(redirectsPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const checkoutRedirects = `
# Divine Blueprint direct ecommerce checkout
/api/checkout/stripe /.netlify/functions/create-stripe-checkout 200
/api/checkout/stripe/verify /.netlify/functions/verify-stripe-checkout 200
/api/checkout/paystack /.netlify/functions/create-paystack-checkout 200
/api/checkout/paystack/verify /.netlify/functions/verify-paystack-checkout 200
`;
if (!redirects.includes("# Divine Blueprint direct ecommerce checkout")) {
  redirects = `${checkoutRedirects.trim()}\n${redirects.trim()}\n`;
  await writeFile(redirectsPath, redirects, "utf8");
}

await writeFile(
  join(siteRoot, "direct-store-status.txt"),
  [
    "DIRECT_ECOMMERCE_STORE=ACTIVE",
    `STORE_URL=${config.storeUrl}`,
    `PAPERBACK_US=${config.paperbackPriceUs}`,
    `KINDLE=${config.kindleLaunchPrice}`,
    `PAPERBACK_NIGERIA=${config.paperbackPriceNigeria}`,
    "STRIPE_ENDPOINT=/api/checkout/stripe",
    "PAYSTACK_ENDPOINT=/api/checkout/paystack",
    "BULK_FORM=divine-blueprint-bulk-order"
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Generated the direct ecommerce store at ${config.storeUrl}.`);
