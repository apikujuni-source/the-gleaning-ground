import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

const siteSettingsPath = "content/site.json";
const infoEmailFallback = "info@gleaningground.com";
const exactLogoFallback = "/assets/uploads/logo_official.png";

if (!existsSync(siteSettingsPath)) {
  throw new Error(`Missing site settings: ${siteSettingsPath}`);
}

const siteSettings = JSON.parse(await readFile(siteSettingsPath, "utf8"));
const siteName = String(siteSettings.name || "The Gleaning Ground").trim();
const infoEmail = String(siteSettings.email || infoEmailFallback).trim();
const logoPath = String(siteSettings.logo || exactLogoFallback).trim();
const logoAlt = String(siteSettings.logoAlt || "The Gleaning Ground official logo").trim();
const uploadedLogoSource = logoPath.startsWith("/assets/uploads/")
  ? join("content/uploads", basename(logoPath))
  : null;

if (!logoPath) throw new Error("The official logo path is empty in content/site.json.");
if (uploadedLogoSource && !existsSync(uploadedLogoSource)) {
  throw new Error(`The official logo file does not exist: ${uploadedLogoSource}`);
}

async function replaceInFile(path, transform) {
  if (!existsSync(path)) return;
  const original = await readFile(path, "utf8");
  const updated = transform(original);
  if (updated !== original) await writeFile(path, updated, "utf8");
}

const escapeAttribute = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const exactLogoMarkup = `<img class="official-site-logo" src="${escapeAttribute(logoPath)}" alt="${escapeAttribute(logoAlt)}">`;
const headerBrandMarkup = `${exactLogoMarkup}<span class="official-site-name" aria-label="${escapeAttribute(siteName)}"><strong>${escapeHtml(siteName)}</strong></span>`;
const originalBrandPattern = /<img src="\/assets\/mark\.svg" alt="">\s*<span><strong>Gleaning<\/strong><em>Ground<\/em><\/span>/g;
const priorMarkBrandPattern = /<img class="official-site-mark"[^>]*>\s*<span class="official-site-name">[\s\S]*?<\/span>/g;
const priorHeaderBrandPattern = /<img class="official-site-logo"[^>]*>\s*<span class="official-site-name"[\s\S]*?<\/span>/g;
const priorLogoPattern = /<img class="official-site-logo"[^>]*>/g;

await replaceInFile("src/_includes/partials/header.njk", (content) => {
  let updated = content.replace(priorHeaderBrandPattern, headerBrandMarkup);
  updated = updated.replace(priorMarkBrandPattern, headerBrandMarkup);
  updated = updated.replace(originalBrandPattern, headerBrandMarkup);
  if (!updated.includes('class="official-site-name"')) {
    updated = updated.replace(priorLogoPattern, headerBrandMarkup);
  }
  return updated;
});

await replaceInFile("src/_includes/partials/footer.njk", (content) => {
  let updated = content.replace(priorHeaderBrandPattern, exactLogoMarkup);
  updated = updated.replace(priorMarkBrandPattern, exactLogoMarkup);
  updated = updated.replace(originalBrandPattern, exactLogoMarkup);
  updated = updated.replace(priorLogoPattern, exactLogoMarkup);
  if (!updated.includes('class="footer-email"')) {
    updated = updated.replace(
      "</form></section>",
      `</form><a class="footer-email" href="mailto:${escapeAttribute(infoEmail)}">${escapeHtml(infoEmail)}</a></section>`
    );
  }
  return updated;
});

await replaceInFile("src/contact.njk", (content) => {
  if (content.includes(`mailto:${infoEmail}`)) return content;
  return content.replace(
    '<div class="contact-notes">',
    `<div class="contact-notes"><p><strong>Email</strong><br><a href="mailto:${escapeAttribute(infoEmail)}">${escapeHtml(infoEmail)}</a></p>`
  );
});

await replaceInFile("src/admin/config.yml", (content) =>
  content.replace(/^logo_url:.*$/m, `logo_url: https://gleaningground.com${logoPath}`)
);

const cssMarker = "/* Exact official Gleaning Ground logo */";
await replaceInFile("src/assets/css/styles.css", (content) => {
  const rules = `${cssMarker}\n.brand{display:inline-flex;align-items:center;gap:.7rem}.brand .official-site-logo{display:block;width:72px;height:72px;max-width:none;flex:0 0 auto;object-fit:contain;object-position:center;background:transparent;border:0;border-radius:0;filter:none;transform:none}.brand .official-site-name{display:block;line-height:1.05;color:inherit}.brand .official-site-name strong{display:block;font-size:1.08rem;font-weight:800;letter-spacing:.025em;white-space:nowrap}.footer-brand{display:inline-flex;align-items:center;justify-content:center;background:transparent;border-radius:0;padding:0}.footer-brand .official-site-logo{display:block;width:190px;height:190px;max-width:100%;object-fit:contain;object-position:center;background:transparent;border:0;border-radius:0;filter:none;transform:none}.footer-email{display:inline-block;margin-top:1rem;color:var(--gold-soft);font-weight:750}.footer-email:hover{color:white}@media(max-width:680px){.brand{gap:.5rem}.brand .official-site-logo{width:58px;height:58px}.brand .official-site-name strong{font-size:.92rem;white-space:normal;max-width:8.5rem}.footer-brand .official-site-logo{width:160px;height:160px}}\n`;
  if (content.includes(cssMarker)) {
    return content.replace(new RegExp(`${cssMarker}[\\s\\S]*?(?=\\n\/\\*|$)`), rules.trimEnd());
  }
  return `${content}\n${rules}`;
});

const emailVariants = [
  "hello@thegleaningground.com",
  "hello@gleaningground.com",
  "info@thegleaningground.com"
];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".njk", ".svg", ".txt", ".xml", ".yaml", ".yml"]);

async function updateSiteReferences(directory) {
  if (!existsSync(directory)) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await updateSiteReferences(path);
      continue;
    }
    if (!textExtensions.has(extname(entry.name).toLowerCase())) continue;
    const original = await readFile(path, "utf8");
    let updated = original;
    for (const oldEmail of emailVariants) updated = updated.split(oldEmail).join(infoEmail);
    if (updated !== original) await writeFile(path, updated, "utf8");
  }
}

await updateSiteReferences("src");

console.log(`Applied the exact official logo ${logoPath}, visible site name ${siteName}, and site email ${infoEmail}.`);
