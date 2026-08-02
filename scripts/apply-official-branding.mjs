import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

const infoEmail = "info@gleaningground.com";
const logoPath = "/assets/uploads/gleaning-ground-logo.svg";
const markPath = "/assets/uploads/gleaning-ground-mark.svg";
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

const headerBrandMarkup = `<img class="official-site-mark" src="${markPath}" alt=""><span class="official-site-name"><strong>Gleaning</strong><em>Ground</em></span>`;
const footerBrandMarkup = `<img class="official-site-logo" src="${logoPath}" alt="The Gleaning Ground">`;
const oldBrandPattern = /<img src="\/assets\/mark\.svg" alt="">\s*<span><strong>Gleaning<\/strong><em>Ground<\/em><\/span>/g;

await replaceInFile("src/_includes/partials/header.njk", (content) =>
  content.replace(oldBrandPattern, headerBrandMarkup)
);

await replaceInFile("src/_includes/partials/footer.njk", (content) => {
  let updated = content.replace(oldBrandPattern, footerBrandMarkup);
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
  return `${content}\n${cssMarker}\n.brand .official-site-mark{width:58px;height:58px;object-fit:contain;border-radius:10px}.brand .official-site-name{display:flex;flex-direction:column;line-height:.95}.brand .official-site-name strong{font-size:1.05rem;letter-spacing:.04em}.brand .official-site-name em{font-size:.86rem;letter-spacing:.18em;text-transform:uppercase}.footer-brand{display:inline-flex;background:#f7e8ce;border-radius:14px;padding:.55rem}.footer-brand .official-site-logo{width:175px;height:auto;display:block}.footer-email{display:inline-block;margin-top:1rem;color:var(--gold-soft);font-weight:750}.footer-email:hover{color:white}@media(max-width:680px){.brand .official-site-mark{width:50px;height:50px}.footer-brand .official-site-logo{width:150px}}\n`;
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

console.log(`Applied the official Gleaning Ground logo, matching mark, and site email ${infoEmail}.`);
