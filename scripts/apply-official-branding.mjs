import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

const infoEmail = "info@gleaningground.com";
const logoPath = "/assets/uploads/gleaning-ground-logo.svg";
const markSource = "content/uploads/gleaning-ground-mark.svg";
const markDestination = "src/assets/mark.svg";

if (!existsSync("content/uploads/gleaning-ground-logo.svg")) {
  throw new Error("Official Gleaning Ground logo asset is missing.");
}
if (!existsSync(markSource)) {
  throw new Error("Official Gleaning Ground mark asset is missing.");
}

await copyFile(markSource, markDestination);

async function replaceInFile(path, transform) {
  if (!existsSync(path)) return;
  const original = await readFile(path, "utf8");
  const updated = transform(original);
  if (updated !== original) await writeFile(path, updated, "utf8");
}

const brandMarkup = '<img class="official-site-logo" src="/assets/uploads/gleaning-ground-logo.svg" alt="Gleaning Ground">';
const oldBrandPattern = /<img src="\/assets\/mark\.svg" alt="">\s*<span><strong>Gleaning<\/strong><em>Ground<\/em><\/span>/g;

await replaceInFile("src/_includes/partials/header.njk", (content) =>
  content.replace(oldBrandPattern, brandMarkup)
);

await replaceInFile("src/_includes/partials/footer.njk", (content) => {
  let updated = content.replace(oldBrandPattern, brandMarkup);
  if (!updated.includes('class="footer-email"')) {
    updated = updated.replace(
      "</form></section>",
      `</form><a class="footer-email" href="mailto:${infoEmail}">${infoEmail}</a></section>`
    );
  }
  return updated;
});

await replaceInFile("src/contact.njk", (content) => {
  if (content.includes(`mailto:${infoEmail}`)) return content;
  return content.replace(
    '<div class="contact-notes">',
    `<div class="contact-notes"><p><strong>Email</strong><br><a href="mailto:${infoEmail}">${infoEmail}</a></p>`
  );
});

await replaceInFile("src/admin/config.yml", (content) =>
  content.replace(/^logo_url:.*$/m, `logo_url: https://gleaningground.com${logoPath}`)
);

const cssMarker = "/* Official Gleaning Ground logo */";
await replaceInFile("src/assets/css/styles.css", (content) => {
  if (content.includes(cssMarker)) return content;
  return `${content}\n${cssMarker}\n.brand .official-site-logo{width:235px;height:auto;max-height:66px;object-fit:contain}.footer-brand{display:inline-flex;background:var(--paper);border-radius:12px;padding:.6rem .85rem}.footer-brand .official-site-logo{width:245px;height:auto;max-height:72px}.footer-email{display:inline-block;margin-top:1rem;color:var(--gold-soft);font-weight:750}.footer-email:hover{color:white}@media(max-width:680px){.brand .official-site-logo{width:195px;max-height:58px}.footer-brand .official-site-logo{width:220px}}\n`;
});

const emailVariants = [
  "hello@thegleaningground.com",
  "hello@gleaningground.com",
  "info@thegleaningground.com"
];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".njk", ".svg", ".txt", ".xml", ".yaml", ".yml"]);

async function updateEmailReferences(directory) {
  if (!existsSync(directory)) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await updateEmailReferences(path);
      continue;
    }
    if (!textExtensions.has(extname(entry.name).toLowerCase())) continue;
    const original = await readFile(path, "utf8");
    let updated = original;
    for (const oldEmail of emailVariants) updated = updated.split(oldEmail).join(infoEmail);
    if (updated !== original) await writeFile(path, updated, "utf8");
  }
}

await updateEmailReferences("src");

console.log(`Applied the official Gleaning Ground logo and site email ${infoEmail}.`);
